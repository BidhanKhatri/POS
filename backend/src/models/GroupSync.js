/**
 * GroupSync — local cache of EMS group membership mapped to POS User IDs.
 *
 * Sync flow:
 *   1. POST /api/reports/group-ems/sync  → fetch EMS groups via service token
 *   2. Match EMS employee emails → POS User._id
 *   3. Upsert this collection
 *   4. Report queries join Sale/Shift/Override on posEmployeeIds
 *
 * The collection is the bridge between EMS identity and POS analytics.
 */
import mongoose from 'mongoose';

const groupSyncSchema = new mongoose.Schema(
  {
    emsGroupId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    groupName: {
      type:     String,
      required: true,
      index:    true,
    },
    // POS User ObjectIds resolved from EMS employee emails
    posEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Raw emails kept so re-sync can detect membership changes cheaply
    emsEmployeeEmails: [{ type: String, lowercase: true }],
    memberCount: {
      type:    Number,
      default: 0,
    },
    lastSyncedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

groupSyncSchema.index({ posEmployeeIds: 1 });

export default mongoose.model('GroupSync', groupSyncSchema);
