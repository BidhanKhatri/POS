/**
 * groupReportService.js — EMS-group analytics aggregations.
 *
 * All data is sourced from POS collections (Sale, Shift, ManagerOverride, User).
 * Group membership comes from GroupSync (local cache of EMS groups).
 *
 * Aggregation pattern mirrors reportService.js for consistency.
 */

import mongoose from 'mongoose';
import Sale           from '../models/Sale.js';
import Shift          from '../models/Shift.js';
import ManagerOverride from '../models/ManagerOverride.js';
import User           from '../models/User.js';
import GroupSync      from '../models/GroupSync.js';
import { getGroupsSynced } from './groupSyncService.js';

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map();

function ck(name, params) { return `${name}:${JSON.stringify(params)}`; }

function getCached(key) {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { _cache.delete(key); return null; }
  return e.value;
}

function setCached(key, value, ttlSec) {
  if (ttlSec <= 0) return;
  _cache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

const TODAY_START = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
function ttlFor(end) { return new Date(end) < TODAY_START() ? 3600 : 0; }
function r2(n) { return Math.round((n ?? 0) * 100) / 100; }

// ─── Core aggregation helpers ─────────────────────────────────────────────────

/**
 * Aggregate Sale data for a set of employee ObjectIds in [start, end].
 * Returns { grossRevenue, refundedAmount, netRevenue, txnCount, avgTicket }.
 */
async function salesAgg(empIds, start, end) {
  if (!empIds.length) return { grossRevenue: 0, refundedAmount: 0, tipTotal: 0, netRevenue: 0, txnCount: 0, avgTicket: 0 };

  const [row] = await Sale.aggregate([
    {
      $match: {
        employeeId:    { $in: empIds },
        createdAt:     { $gte: start, $lte: end },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id:            null,
        grossRevenue:   { $sum: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
        // Refund tips — never revenue, aggregated and reported separately.
        tipTotal:       { $sum: '$tipTotal' },
        txnCount:       { $sum: 1 },
      },
    },
    {
      $addFields: {
        netRevenue: { $subtract: ['$grossRevenue', '$refundedAmount'] },
        avgTicket: {
          $cond: [
            { $gt: ['$txnCount', 0] },
            { $divide: [{ $subtract: ['$grossRevenue', '$refundedAmount'] }, '$txnCount'] },
            0,
          ],
        },
      },
    },
  ]);

  if (!row) return { grossRevenue: 0, refundedAmount: 0, tipTotal: 0, netRevenue: 0, txnCount: 0, avgTicket: 0 };
  return {
    grossRevenue:   r2(row.grossRevenue),
    refundedAmount: r2(row.refundedAmount),
    tipTotal:       r2(row.tipTotal),
    netRevenue:     r2(row.netRevenue),
    txnCount:       row.txnCount,
    avgTicket:      r2(row.avgTicket),
  };
}

/**
 * Total hours worked by a set of employees in [start, end] (CLOSED shifts only).
 */
async function shiftHoursAgg(empIds, start, end) {
  if (!empIds.length) return 0;

  const [row] = await Shift.aggregate([
    {
      $match: {
        employeeId: { $in: empIds },
        shiftDate:  { $gte: start, $lte: end },
        status:     'CLOSED',
        clockOutTime: { $exists: true },
      },
    },
    {
      $group: {
        _id:          null,
        totalMinutes: {
          $sum: {
            $divide: [
              { $subtract: ['$clockOutTime', '$clockInTime'] },
              60000,
            ],
          },
        },
      },
    },
  ]);

  return row ? r2(row.totalMinutes / 60) : 0;
}

/**
 * Count approved refund overrides for a set of employees in [start, end].
 */
async function refundOverrideCount(empIds, start, end) {
  if (!empIds.length) return 0;

  const [row] = await ManagerOverride.aggregate([
    {
      $match: {
        employeeId: { $in: empIds },
        createdAt:  { $gte: start, $lte: end },
        actionType: 'REFUND',
        status:     'APPROVED',
      },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  return row?.count ?? 0;
}

/**
 * Count distinct employees who clocked in at least once in [start, end].
 */
async function attendanceCount(empIds, start, end) {
  if (!empIds.length) return 0;

  const rows = await Shift.distinct('employeeId', {
    employeeId: { $in: empIds },
    shiftDate:  { $gte: start, $lte: end },
  });

  return rows.length;
}

// ─── Compute stats for one group ──────────────────────────────────────────────

async function computeGroupStats(group, start, end) {
  const empIds = (group.posEmployeeIds ?? []).map(id =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id))
  );

  if (!empIds.length) {
    return {
      revenue:        0,
      refundedAmount: 0,
      tipTotal:       0,
      txnCount:       0,
      avgTicket:      0,
      hoursWorked:    0,
      revenuePerHour: 0,
      refundRate:     0,
      attendanceRate: 0,
      attended:       0,
      memberCount:    group.memberCount ?? 0,
    };
  }

  const [sales, hours, refunds, attended] = await Promise.all([
    salesAgg(empIds, start, end),
    shiftHoursAgg(empIds, start, end),
    refundOverrideCount(empIds, start, end),
    attendanceCount(empIds, start, end),
  ]);

  const revenuePerHour = hours > 0 ? r2(sales.netRevenue / hours) : 0;
  const refundRate     = sales.txnCount > 0 ? r2((refunds / sales.txnCount) * 100) : 0;
  const memberCount    = group.memberCount ?? empIds.length;
  const attendanceRate = memberCount > 0 ? r2((attended / memberCount) * 100) : 0;

  return {
    revenue:        sales.netRevenue,
    refundedAmount: sales.refundedAmount,
    tipTotal:       sales.tipTotal,
    txnCount:       sales.txnCount,
    avgTicket:      sales.avgTicket,
    hoursWorked:    hours,
    revenuePerHour,
    refundRate,
    attendanceRate,
    attended,
    memberCount,
  };
}

// ─── 1. All groups summary ────────────────────────────────────────────────────

export async function getGroupsSummary({ start, end }) {
  const key = ck('grp-summary', { start, end });
  const hit = getCached(key);
  if (hit) return hit;

  const s = new Date(start);
  const e = new Date(end);

  const groups = await getGroupsSynced();
  if (!groups.length) return { groups: [], totals: null };

  const results = await Promise.all(
    groups.map(async g => ({
      groupId:   g.emsGroupId,
      groupName: g.groupName,
      memberCount: g.memberCount,
      lastSyncedAt: g.lastSyncedAt,
      stats: await computeGroupStats(g, s, e),
    }))
  );

  // Overall totals (deduped — employees can belong to multiple groups,
  // so we collect unique employee IDs then aggregate once)
  const allEmpIds = [
    ...new Set(
      groups.flatMap(g => (g.posEmployeeIds ?? []).map(id => String(id)))
    ),
  ].map(id => new mongoose.Types.ObjectId(id));

  const [totalSales, totalHours] = await Promise.all([
    salesAgg(allEmpIds, s, e),
    shiftHoursAgg(allEmpIds, s, e),
  ]);

  const totals = {
    revenue:        totalSales.netRevenue,
    tipTotal:       totalSales.tipTotal,
    txnCount:       totalSales.txnCount,
    avgTicket:      totalSales.avgTicket,
    revenuePerHour: totalHours > 0 ? r2(totalSales.netRevenue / totalHours) : 0,
    totalGroups:    groups.length,
  };

  const result = { groups: results, totals };
  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 2. Single group detail ───────────────────────────────────────────────────

export async function getGroupDetail({ groupId, start, end }) {
  const key = ck('grp-detail', { groupId, start, end });
  const hit = getCached(key);
  if (hit) return hit;

  const s = new Date(start);
  const e = new Date(end);

  const group = await GroupSync.findOne({ emsGroupId: groupId }).lean();
  if (!group) throw Object.assign(new Error('Group not found'), { status: 404 });

  const empIds = (group.posEmployeeIds ?? []).map(id =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id))
  );

  const [stats, perEmpSales, perEmpShifts, perEmpRefunds, userDocs] = await Promise.all([
    computeGroupStats(group, s, e),
    Sale.aggregate([
      {
        $match: {
          employeeId:    { $in: empIds },
          createdAt:     { $gte: s, $lte: e },
          paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'] },
        },
      },
      {
        $group: {
          _id:            '$employeeId',
          grossRevenue:   { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, '$grandTotal', 0] } },
          refundedAmount: { $sum: '$refundedAmount' },
          tipTotal:       { $sum: '$tipTotal' },
          txnCount:       { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
          voidCount:      { $sum: { $cond: [{ $eq: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
        },
      },
    ]),
    Shift.aggregate([
      {
        $match: {
          employeeId: { $in: empIds },
          shiftDate:  { $gte: s, $lte: e },
          status:     'CLOSED',
        },
      },
      {
        $group: {
          _id:          '$employeeId',
          totalMinutes: { $sum: { $divide: [{ $subtract: ['$clockOutTime', '$clockInTime'] }, 60000] } },
          shiftCount:   { $sum: 1 },
        },
      },
    ]),
    ManagerOverride.aggregate([
      {
        $match: {
          employeeId: { $in: empIds },
          createdAt:  { $gte: s, $lte: e },
          actionType: 'REFUND',
          status:     'APPROVED',
        },
      },
      { $group: { _id: '$employeeId', refunds: { $sum: 1 } } },
    ]),
    User.find({ _id: { $in: empIds } }).select('name email employeeCode role').lean(),
  ]);

  const salesMap   = Object.fromEntries(perEmpSales.map(r => [String(r._id), r]));
  const shiftsMap  = Object.fromEntries(perEmpShifts.map(r => [String(r._id), r]));
  const refundsMap = Object.fromEntries(perEmpRefunds.map(r => [String(r._id), r]));

  const members = userDocs.map(u => {
    const sid   = String(u._id);
    const s_    = salesMap[sid]   || { grossRevenue: 0, refundedAmount: 0, tipTotal: 0, txnCount: 0, voidCount: 0 };
    const sh_   = shiftsMap[sid]  || { totalMinutes: 0, shiftCount: 0 };
    const rf_   = refundsMap[sid] || { refunds: 0 };
    const net   = r2(s_.grossRevenue - s_.refundedAmount);
    const hours = r2(sh_.totalMinutes / 60);
    return {
      employeeId:     u._id,
      name:           u.name,
      email:          u.email,
      code:           u.employeeCode,
      role:           u.role,
      netRevenue:     net,
      tipTotal:       r2(s_.tipTotal || 0),
      txnCount:       s_.txnCount,
      avgTicket:      s_.txnCount > 0 ? r2(net / s_.txnCount) : 0,
      hoursWorked:    hours,
      revenuePerHour: hours > 0 ? r2(net / hours) : 0,
      shiftCount:     sh_.shiftCount,
      voidCount:      s_.voidCount,
      approvedRefunds: rf_.refunds,
      refundRate:     s_.txnCount > 0 ? r2((rf_.refunds / s_.txnCount) * 100) : 0,
    };
  }).sort((a, b) => b.netRevenue - a.netRevenue);

  const result = {
    groupId:     group.emsGroupId,
    groupName:   group.groupName,
    lastSyncedAt: group.lastSyncedAt,
    stats,
    members,
  };

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 3. Trend for one group (or all groups combined) ─────────────────────────

export async function getGroupTrend({ groupId, start, end, groupBy = 'day' }) {
  const key = ck('grp-trend', { groupId, start, end, groupBy });
  const hit = getCached(key);
  if (hit) return hit;

  const s = new Date(start);
  const e = new Date(end);

  let empIds;
  if (groupId) {
    const group = await GroupSync.findOne({ emsGroupId: groupId }).lean();
    empIds = group ? (group.posEmployeeIds ?? []).map(id => new mongoose.Types.ObjectId(String(id))) : [];
  } else {
    const groups = await getGroupsSynced();
    const all = [...new Set(groups.flatMap(g => (g.posEmployeeIds ?? []).map(id => String(id))))];
    empIds = all.map(id => new mongoose.Types.ObjectId(id));
  }

  if (!empIds.length) return [];

  const dateTrunc =
    groupBy === 'hour'  ? { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$createdAt' } } :
    groupBy === 'month' ? { $dateToString: { format: '%Y-%m',          date: '$createdAt' } } :
                          { $dateToString: { format: '%Y-%m-%d',        date: '$createdAt' } };

  const rows = await Sale.aggregate([
    {
      $match: {
        employeeId:    { $in: empIds },
        createdAt:     { $gte: s, $lte: e },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id:            dateTrunc,
        revenue:        { $sum: { $subtract: ['$grandTotal', '$refundedAmount'] } },
        txnCount:       { $sum: 1 },
        refundedAmount: { $sum: '$refundedAmount' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id:            0,
        date:           '$_id',
        revenue:        { $round: ['$revenue', 2] },
        txnCount:       1,
        refundedAmount: { $round: ['$refundedAmount', 2] },
      },
    },
  ]);

  setCached(key, rows, ttlFor(end));
  return rows;
}

// ─── 4. Leaderboard ──────────────────────────────────────────────────────────

export async function getGroupLeaderboard({ start, end, rankBy = 'revenue' }) {
  const key = ck('grp-leaderboard', { start, end, rankBy });
  const hit = getCached(key);
  if (hit) return hit;

  const { groups } = await getGroupsSummary({ start, end });
  if (!groups.length) return [];

  const sorted = [...groups].sort((a, b) => {
    if (rankBy === 'revenue')    return b.stats.revenue        - a.stats.revenue;
    if (rankBy === 'txnCount')   return b.stats.txnCount       - a.stats.txnCount;
    if (rankBy === 'revenuePerHour') return b.stats.revenuePerHour - a.stats.revenuePerHour;
    return b.stats.revenue - a.stats.revenue;
  });

  const result = sorted.map((g, i) => ({ rank: i + 1, ...g }));
  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 5. CSV export ────────────────────────────────────────────────────────────

export async function exportGroupsCSV({ start, end }) {
  const { groups } = await getGroupsSummary({ start, end });

  const lines = [
    'Group,Members,Revenue,Refunded,Tips (not revenue),Transactions,Avg Ticket,Hours Worked,Rev/Hour,Refund Rate %,Attendance Rate %',
    ...groups.map(g => [
      `"${g.groupName}"`,
      g.stats.memberCount,
      g.stats.revenue,
      g.stats.refundedAmount,
      g.stats.tipTotal,
      g.stats.txnCount,
      g.stats.avgTicket,
      g.stats.hoursWorked,
      g.stats.revenuePerHour,
      g.stats.refundRate,
      g.stats.attendanceRate,
    ].join(',')),
  ];

  return lines.join('\n');
}
