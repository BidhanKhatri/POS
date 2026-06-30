/**
 * groupSyncService.js
 *
 * Bridges EMS group membership with POS analytics by:
 *  1. Fetching groups from EMS /integrations/groups (service-token auth)
 *  2. Resolving EMS employee emails → POS User._id
 *  3. Upserting GroupSync documents (local cache)
 *
 * The sync can be triggered on-demand by a manager; it also runs lazily
 * on the first report query when no GroupSync documents exist.
 */

import User      from '../models/User.js';
import GroupSync from '../models/GroupSync.js';
import * as staffingService from './staffingService.js';

// ─── Sync ────────────────────────────────────────────────────────────────────

/**
 * Pull groups from EMS, match emails to POS Users, upsert GroupSync.
 * Returns a summary object; throws if EMS is unreachable.
 */
export async function syncGroupsFromEMS() {
  const emsGroups = await staffingService.fetchGroups();

  if (!Array.isArray(emsGroups) || emsGroups.length === 0) {
    return { synced: true, totalGroups: 0, totalMapped: 0, syncedAt: new Date().toISOString() };
  }

  // Collect all unique EMS emails across all groups for a single User lookup
  const allEmails = [
    ...new Set(
      emsGroups.flatMap(g => (g.employees ?? []).map(e => e.email?.toLowerCase()).filter(Boolean))
    ),
  ];

  const posUsers = await User.find({ email: { $in: allEmails } })
    .select('_id email')
    .lean();

  const emailToId = {};
  for (const u of posUsers) {
    if (u.email) emailToId[u.email.toLowerCase()] = u._id;
  }

  let totalMapped = 0;
  const ops = [];

  for (const group of emsGroups) {
    const emails   = (group.employees ?? []).map(e => e.email?.toLowerCase()).filter(Boolean);
    const posIds   = emails.map(em => emailToId[em]).filter(Boolean);
    totalMapped   += posIds.length;

    ops.push({
      updateOne: {
        filter: { emsGroupId: String(group._id) },
        update: {
          $set: {
            groupName:         group.name,
            posEmployeeIds:    posIds,
            emsEmployeeEmails: emails,
            memberCount:       posIds.length,
            lastSyncedAt:      new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await GroupSync.bulkWrite(ops, { ordered: false });
  }

  // Remove stale groups that no longer exist in EMS
  const liveEmsIds = emsGroups.map(g => String(g._id));
  await GroupSync.deleteMany({ emsGroupId: { $nin: liveEmsIds } });

  // Bust EMS staffingService cache so next sync gets fresh data
  staffingService.bustCache('ems:groups:all');

  return {
    synced:       true,
    totalGroups:  emsGroups.length,
    totalMapped,
    syncedAt:     new Date().toISOString(),
  };
}

/**
 * Return all locally cached groups. Auto-syncs if collection is empty.
 */
export async function getGroupsSynced() {
  const groups = await GroupSync.find().sort({ groupName: 1 }).lean();

  if (groups.length === 0) {
    try {
      await syncGroupsFromEMS();
      return GroupSync.find().sort({ groupName: 1 }).lean();
    } catch {
      return [];
    }
  }

  return groups;
}
