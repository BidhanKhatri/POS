/**
 * posGroupReportService.js
 * Analytics aggregations for POS-native Groups (sync OFF mode).
 * Mirrors the shape of groupReportService.js so the frontend
 * can use identical UI components for both EMS and POS groups.
 */
import mongoose from 'mongoose';
import Sale           from '../models/Sale.js';
import Shift          from '../models/Shift.js';
import ManagerOverride from '../models/ManagerOverride.js';
import Group          from '../models/Group.js';

function r2(n) { return Math.round((n ?? 0) * 100) / 100; }

// ─── Core helpers ─────────────────────────────────────────────────────────────

async function salesAgg(empIds, start, end) {
  if (!empIds.length) return { grossRevenue: 0, refundedAmount: 0, netRevenue: 0, txnCount: 0, avgTicket: 0 };

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

  if (!row) return { grossRevenue: 0, refundedAmount: 0, netRevenue: 0, txnCount: 0, avgTicket: 0 };
  return {
    grossRevenue:   r2(row.grossRevenue),
    refundedAmount: r2(row.refundedAmount),
    netRevenue:     r2(row.netRevenue),
    txnCount:       row.txnCount,
    avgTicket:      r2(row.avgTicket),
  };
}

async function shiftHoursAgg(empIds, start, end) {
  if (!empIds.length) return 0;
  const [row] = await Shift.aggregate([
    {
      $match: {
        employeeId:   { $in: empIds },
        shiftDate:    { $gte: start, $lte: end },
        status:       'CLOSED',
        clockOutTime: { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        totalMinutes: {
          $sum: { $divide: [{ $subtract: ['$clockOutTime', '$clockInTime'] }, 60000] },
        },
      },
    },
  ]);
  return row ? r2(row.totalMinutes / 60) : 0;
}

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

async function attendanceCount(empIds, start, end) {
  if (!empIds.length) return 0;
  const rows = await Shift.distinct('employeeId', {
    employeeId: { $in: empIds },
    shiftDate:  { $gte: start, $lte: end },
  });
  return rows.length;
}

// ─── Stats for one group ──────────────────────────────────────────────────────

async function computeGroupStats(memberIds, start, end) {
  const empIds = memberIds.map(id =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id))
  );

  const memberCount = empIds.length;

  if (!memberCount) {
    return { revenue: 0, refundedAmount: 0, txnCount: 0, avgTicket: 0, hoursWorked: 0, revenuePerHour: 0, refundRate: 0, attendanceRate: 0, attended: 0, memberCount: 0 };
  }

  const [sales, hours, refunds, attended] = await Promise.all([
    salesAgg(empIds, start, end),
    shiftHoursAgg(empIds, start, end),
    refundOverrideCount(empIds, start, end),
    attendanceCount(empIds, start, end),
  ]);

  return {
    revenue:        sales.netRevenue,
    refundedAmount: sales.refundedAmount,
    txnCount:       sales.txnCount,
    avgTicket:      sales.avgTicket,
    hoursWorked:    hours,
    revenuePerHour: hours > 0 ? r2(sales.netRevenue / hours) : 0,
    refundRate:     sales.txnCount > 0 ? r2((refunds / sales.txnCount) * 100) : 0,
    attendanceRate: memberCount > 0 ? r2((attended / memberCount) * 100) : 0,
    attended,
    memberCount,
  };
}

// ─── Per-member stats ─────────────────────────────────────────────────────────

async function memberStats(member, start, end) {
  const empId = new mongoose.Types.ObjectId(String(member._id));
  const [sales, hours] = await Promise.all([
    salesAgg([empId], start, end),
    shiftHoursAgg([empId], start, end),
  ]);
  return {
    employeeId:     member._id,
    name:           member.name,
    code:           member.employeeCode,
    netRevenue:     sales.netRevenue,
    txnCount:       sales.txnCount,
    avgTicket:      sales.avgTicket,
    revenuePerHour: hours > 0 ? r2(sales.netRevenue / hours) : 0,
    hoursWorked:    hours,
  };
}

// ─── Trend data ───────────────────────────────────────────────────────────────

async function trendAgg(empIds, start, end, groupBy) {
  if (!empIds.length) return [];

  const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'hour' ? '%Y-%m-%dT%H' : '%Y-%m-%d';

  const rows = await Sale.aggregate([
    {
      $match: {
        employeeId:    { $in: empIds },
        createdAt:     { $gte: start, $lte: end },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id:            { $dateToString: { format: dateFormat, date: '$createdAt' } },
        revenue:        { $sum: { $subtract: ['$grandTotal', { $ifNull: ['$refundedAmount', 0] }] } },
        txnCount:       { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map(r => ({ date: r._id, revenue: r2(r.revenue), txnCount: r.txnCount }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getPosGroupsSummary({ start, end }) {
  const s = new Date(start);
  const e = new Date(end);

  const groups = await Group.find().populate('members', '_id name email employeeCode').lean();
  if (!groups.length) return { groups: [], totals: { revenue: 0, txnCount: 0, avgTicket: 0, revenuePerHour: 0, totalGroups: 0 } };

  const withStats = await Promise.all(
    groups.map(async g => {
      const stats = await computeGroupStats(g.members.map(m => m._id), s, e);
      return { groupId: g._id.toString(), groupName: g.name, stats };
    })
  );

  const totalRevenue = withStats.reduce((sum, g) => sum + g.stats.revenue, 0);
  const totalTxns    = withStats.reduce((sum, g) => sum + g.stats.txnCount, 0);
  const totalHours   = withStats.reduce((sum, g) => sum + g.stats.hoursWorked, 0);

  const totals = {
    revenue:        r2(totalRevenue),
    txnCount:       totalTxns,
    avgTicket:      totalTxns > 0 ? r2(totalRevenue / totalTxns) : 0,
    revenuePerHour: totalHours > 0 ? r2(totalRevenue / totalHours) : 0,
    totalGroups:    groups.length,
  };

  return { groups: withStats, totals };
}

export async function getPosGroupDetail({ groupId, start, end }) {
  const s = new Date(start);
  const e = new Date(end);

  const group = await Group.findById(groupId).populate('members', '_id name email employeeCode').lean();
  if (!group) return null;

  const [stats, members] = await Promise.all([
    computeGroupStats(group.members.map(m => m._id), s, e),
    Promise.all(group.members.map(m => memberStats(m, s, e))),
  ]);

  members.sort((a, b) => b.netRevenue - a.netRevenue);

  return {
    groupId:   group._id.toString(),
    groupName: group.name,
    stats,
    members,
  };
}

export async function getPosGroupTrend({ groupId, start, end, groupBy = 'day' }) {
  const s = new Date(start);
  const e = new Date(end);

  const group = await Group.findById(groupId).lean();
  if (!group) return [];

  const empIds = group.members.map(id => new mongoose.Types.ObjectId(String(id)));
  return trendAgg(empIds, s, e, groupBy);
}
