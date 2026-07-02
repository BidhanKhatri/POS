/**
 * Report Service — enterprise-grade analytics aggregations.
 * All queries run against real Sale, Payment, ManagerOverride, Shift, User, Product collections.
 * Follows: Route → Controller → Service → Model (AGENTS.md)
 */

import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import ManagerOverride from '../models/ManagerOverride.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

// ─── Simple in-memory cache (closed periods never change) ───────────────────
const _cache = new Map();
const TODAY_START = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function cacheKey(name, params) {
  return `${name}:${JSON.stringify(params)}`;
}

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.value;
}

function setCached(key, value, ttlSeconds) {
  if (ttlSeconds <= 0) return; // never cache live/today data
  _cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// TTL: closed periods = 24h, live (today-inclusive) = 0 (no cache, always fresh)
function ttlFor(end) {
  const endDate = new Date(end);
  return endDate < TODAY_START() ? 86400 : 0;
}

function isLive(end) {
  return new Date(end) >= TODAY_START();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRange(start, end) {
  return {
    start: new Date(start),
    end:   new Date(end),
  };
}

function delta(current, prior) {
  if (!prior || prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 10000) / 100; // 2dp %
}

// ─── 1. SUMMARY KPIs ────────────────────────────────────────────────────────
// Returns gross/net revenue, transaction count, avg ticket, refund rate, tax,
// discount impact — for current and prior periods with deltas.

async function getSummary({ start, end, compareStart, compareEnd }) {
  const key = cacheKey('summary', { start, end, compareStart, compareEnd });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const pipeline = (from, to) => [
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id: null,
        grossRevenue:   { $sum: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
        discountTotal:  { $sum: '$discountTotal' },
        taxTotal:       { $sum: '$taxTotal' },
        txnCount:       { $sum: 1 },
        itemsSold: {
          $sum: { $sum: '$items.quantity' },
        },
      },
    },
    {
      $addFields: {
        netRevenue:  { $subtract: ['$grossRevenue', '$refundedAmount'] },
        avgTicket: {
          $cond: [
            { $gt: ['$txnCount', 0] },
            { $divide: [{ $subtract: ['$grossRevenue', '$refundedAmount'] }, '$txnCount'] },
            0,
          ],
        },
        itemsPerTxn: {
          $cond: [
            { $gt: ['$txnCount', 0] },
            { $divide: ['$itemsSold', '$txnCount'] },
            0,
          ],
        },
      },
    },
  ];

  const refundCountPipeline = (from, to) => [
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        actionType: 'REFUND',
        status: 'APPROVED',
      },
    },
    { $count: 'count' },
  ];

  const salesFilter = { createdAt: { $gte: s, $lte: e }, paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] } };

  // Midday = the single sale whose createdAt is closest to 12:00 of the range start date
  const noon = new Date(s);
  noon.setHours(12, 0, 0, 0);

  const midDayPipeline = [
    { $match: salesFilter },
    { $addFields: { distFromNoon: { $abs: { $subtract: ['$createdAt', noon] } } } },
    { $sort: { distFromNoon: 1 } },
    { $limit: 1 },
    { $project: { grandTotal: 1, createdAt: 1 } },
  ];

  const [currentRaw, priorRaw, currentRefundCounts, priorRefundCounts, firstSale, midDaySaleArr] = await Promise.all([
    Sale.aggregate(pipeline(s, e)),
    compareStart && compareEnd
      ? Sale.aggregate(pipeline(new Date(compareStart), new Date(compareEnd)))
      : Promise.resolve([]),
    ManagerOverride.aggregate(refundCountPipeline(s, e)),
    compareStart && compareEnd
      ? ManagerOverride.aggregate(refundCountPipeline(new Date(compareStart), new Date(compareEnd)))
      : Promise.resolve([]),
    Sale.findOne(salesFilter).sort({ createdAt: 1 }).select('grandTotal createdAt').lean(),
    Sale.aggregate(midDayPipeline),
  ]);

  const midDaySale = midDaySaleArr[0] || null;

  const cur  = currentRaw[0]  || { grossRevenue: 0, netRevenue: 0, refundedAmount: 0, discountTotal: 0, taxTotal: 0, txnCount: 0, avgTicket: 0, itemsSold: 0, itemsPerTxn: 0 };
  const pri  = priorRaw[0]   || { grossRevenue: 0, netRevenue: 0, refundedAmount: 0, discountTotal: 0, taxTotal: 0, txnCount: 0, avgTicket: 0, itemsSold: 0, itemsPerTxn: 0 };

  const curRefunds = currentRefundCounts[0]?.count || 0;
  const priRefunds = priorRefundCounts[0]?.count   || 0;

  const result = {
    current: {
      grossRevenue:   Math.round(cur.grossRevenue   * 100) / 100,
      netRevenue:     Math.round(cur.netRevenue     * 100) / 100,
      refundedAmount: Math.round(cur.refundedAmount * 100) / 100,
      discountTotal:  Math.round(cur.discountTotal  * 100) / 100,
      taxTotal:       Math.round(cur.taxTotal       * 100) / 100,
      txnCount:       cur.txnCount,
      avgTicket:      Math.round(cur.avgTicket      * 100) / 100,
      itemsSold:      cur.itemsSold,
      itemsPerTxn:    Math.round(cur.itemsPerTxn   * 100) / 100,
      refundCount:      curRefunds,
      refundRate:       cur.txnCount > 0 ? Math.round((curRefunds / cur.txnCount) * 10000) / 100 : 0,
      firstSaleAmount:   firstSale   ? Math.round(firstSale.grandTotal   * 100) / 100 : null,
      firstSaleTime:     firstSale   ? firstSale.createdAt   : null,
      midDaySaleAmount:  midDaySale  ? Math.round(midDaySale.grandTotal  * 100) / 100 : null,
      midDaySaleTime:    midDaySale  ? midDaySale.createdAt  : null,
    },
    prior: compareStart ? {
      grossRevenue:   Math.round(pri.grossRevenue   * 100) / 100,
      netRevenue:     Math.round(pri.netRevenue     * 100) / 100,
      refundedAmount: Math.round(pri.refundedAmount * 100) / 100,
      discountTotal:  Math.round(pri.discountTotal  * 100) / 100,
      taxTotal:       Math.round(pri.taxTotal       * 100) / 100,
      txnCount:       pri.txnCount,
      avgTicket:      Math.round(pri.avgTicket      * 100) / 100,
      refundCount:    priRefunds,
      refundRate:     pri.txnCount > 0 ? Math.round((priRefunds / pri.txnCount) * 10000) / 100 : 0,
    } : null,
    deltas: compareStart ? {
      netRevenue:     delta(cur.netRevenue,     pri.netRevenue),
      txnCount:       delta(cur.txnCount,       pri.txnCount),
      avgTicket:      delta(cur.avgTicket,      pri.avgTicket),
      refundedAmount: delta(cur.refundedAmount, pri.refundedAmount),
      refundRate:     delta(cur.refundCount,    priRefunds),
      taxTotal:       delta(cur.taxTotal,       pri.taxTotal),
    } : null,
  };

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 2. REVENUE TREND ────────────────────────────────────────────────────────
// Time-series grouped by hour/day/week/month for the area chart.

async function getTrend({ start, end, groupBy = 'day', compareStart, compareEnd }) {
  const key = cacheKey('trend', { start, end, groupBy, compareStart, compareEnd });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const formatMap = {
    hour:  '%Y-%m-%dT%H',
    day:   '%Y-%m-%d',
    week:  '%Y-W%V',
    month: '%Y-%m',
  };
  const format = formatMap[groupBy] || formatMap.day;

  const trendPipeline = (from, to) => [
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt', timezone: 'UTC' } },
        revenue:  { $sum: '$grandTotal' },
        netRevenue: { $sum: { $subtract: ['$grandTotal', { $ifNull: ['$refundedAmount', 0] }] } },
        txnCount: { $sum: 1 },
        refunds:  { $sum: { $ifNull: ['$refundedAmount', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const [current, prior] = await Promise.all([
    Sale.aggregate(trendPipeline(s, e)),
    compareStart && compareEnd
      ? Sale.aggregate(trendPipeline(new Date(compareStart), new Date(compareEnd)))
      : Promise.resolve([]),
  ]);

  const result = {
    current: current.map(d => ({
      period:     d._id,
      revenue:    Math.round(d.revenue    * 100) / 100,
      netRevenue: Math.round(d.netRevenue * 100) / 100,
      txnCount:   d.txnCount,
      refunds:    Math.round(d.refunds    * 100) / 100,
    })),
    prior: prior.map(d => ({
      period:     d._id,
      revenue:    Math.round(d.revenue    * 100) / 100,
      netRevenue: Math.round(d.netRevenue * 100) / 100,
      txnCount:   d.txnCount,
      refunds:    Math.round(d.refunds    * 100) / 100,
    })),
  };

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 3. PAYMENT BREAKDOWN ────────────────────────────────────────────────────

async function getPayments({ start, end }) {
  const key = cacheKey('payments', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const [byMethod, daily] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          direction: 'CHARGE',
          status: 'SUCCESS',
        },
      },
      {
        $group: {
          _id: '$method',
          amount: { $sum: '$amount' },
          count:  { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          direction: 'CHARGE',
          status: 'SUCCESS',
        },
      },
      {
        $group: {
          _id: {
            date:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            method: '$method',
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
  ]);

  const totalAmount = byMethod.reduce((sum, m) => sum + m.amount, 0);
  const methods = byMethod.map(m => ({
    method: m._id,
    amount: Math.round(m.amount * 100) / 100,
    count:  m.count,
    share:  totalAmount > 0 ? Math.round((m.amount / totalAmount) * 10000) / 100 : 0,
  }));

  // Pivot daily into { date, CASH, CREDIT, DEBIT, MISC }
  const dateMap = {};
  for (const d of daily) {
    const { date, method } = d._id;
    if (!dateMap[date]) dateMap[date] = { date };
    dateMap[date][method] = Math.round(d.amount * 100) / 100;
  }
  const dailySeries = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  const result = { methods, dailySeries };
  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 4. TOP PRODUCTS ─────────────────────────────────────────────────────────

async function getProducts({ start, end, limit = 10, sortBy = 'revenue' }) {
  const key = cacheKey('products', { start, end, limit, sortBy });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const sortField = sortBy === 'qty' ? 'qtySold' : sortBy === 'refundRate' ? 'refundRate' : 'revenue';

  const products = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: s, $lte: e },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id:          '$items.productId',
        productName:  { $first: '$items.productName' },
        sku:          { $first: '$items.sku' },
        revenue:      { $sum: '$items.total' },
        qtySold:      { $sum: '$items.quantity' },
        refundedAmt:  { $sum: '$items.refundedAmount' },
        refundedQty:  { $sum: '$items.refundedQty' },
        txnCount:     { $sum: 1 },
      },
    },
    {
      $addFields: {
        netRevenue: { $subtract: ['$revenue', '$refundedAmt'] },
        refundRate: {
          $cond: [
            { $gt: ['$qtySold', 0] },
            { $multiply: [{ $divide: ['$refundedQty', '$qtySold'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { [sortField]: -1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    {
      $addFields: {
        category: { $ifNull: [{ $arrayElemAt: ['$productDoc.categoryId', 0] }, null] },
        costPrice: { $ifNull: [{ $arrayElemAt: ['$productDoc.costPrice', 0] }, 0] },
      },
    },
    { $project: { productDoc: 0 } },
  ]);

  const result = products.map((p, i) => {
    const revenue    = Math.round(p.revenue    * 100) / 100;
    const costPrice  = p.costPrice || 0;
    const cost       = Math.round(p.qtySold * costPrice * 100) / 100;
    const grossProfit = Math.round((revenue - cost) * 100) / 100;
    return {
      rank:        i + 1,
      productId:   p._id,
      productName: p.productName,
      sku:         p.sku,
      revenue,
      netRevenue:  Math.round(p.netRevenue  * 100) / 100,
      qtySold:     p.qtySold,
      refundedQty: p.refundedQty,
      refundedAmt: Math.round(p.refundedAmt * 100) / 100,
      refundRate:  Math.round(p.refundRate  * 100) / 100,
      txnCount:    p.txnCount,
      cost,
      grossProfit,
    };
  });

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 5. CASHIER PERFORMANCE ──────────────────────────────────────────────────

async function getCashiers({ start, end }) {
  const key = cacheKey('cashiers', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const [salesData, overrideData, shiftData] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'] },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          revenue:        { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, '$grandTotal', 0] } },
          refundedAmount: { $sum: '$refundedAmount' },
          txnCount:       { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
          voidCount:      { $sum: { $cond: [{ $eq: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
          discountTotal:  { $sum: '$discountTotal' },
          itemsSold:      { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),
    ManagerOverride.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          actionType: 'REFUND',
        },
      },
      {
        $group: {
          _id:           '$employeeId',
          refundRequests: { $sum: 1 },
          approvedRefunds: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          deniedRefunds:   { $sum: { $cond: [{ $eq: ['$status', 'DENIED']   }, 1, 0] } },
        },
      },
    ]),
    Shift.aggregate([
      {
        $match: {
          shiftDate: { $gte: s, $lte: e },
          status: 'CLOSED',
        },
      },
      {
        $group: {
          _id: '$employeeId',
          totalMinutes: {
            $sum: {
              $divide: [{ $subtract: ['$clockOutTime', '$clockInTime'] }, 60000],
            },
          },
          shiftCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Build lookup maps
  const overrideMap = {};
  for (const o of overrideData) overrideMap[String(o._id)] = o;
  const shiftMap = {};
  for (const sh of shiftData) shiftMap[String(sh._id)] = sh;

  // Fetch employee names
  const employeeIds = salesData.map(s => s._id).filter(Boolean);
  const employees = await User.find({ _id: { $in: employeeIds } }).select('name employeeCode role');
  const empMap = {};
  for (const emp of employees) empMap[String(emp._id)] = emp;

  const result = salesData.map(s => {
    const empId    = String(s._id);
    const emp      = empMap[empId] || {};
    const overrides = overrideMap[empId] || { refundRequests: 0, approvedRefunds: 0, deniedRefunds: 0 };
    const shifts    = shiftMap[empId]    || { totalMinutes: 0, shiftCount: 0 };

    const netRevenue = s.revenue - s.refundedAmount;
    const hours      = Math.round((shifts.totalMinutes / 60) * 10) / 10;
    const avgTicket  = s.txnCount > 0 ? Math.round((netRevenue / s.txnCount) * 100) / 100 : 0;
    const revenuePerHour = hours > 0 ? Math.round((netRevenue / hours) * 100) / 100 : 0;
    const voidRate   = (s.txnCount + s.voidCount) > 0
      ? Math.round((s.voidCount / (s.txnCount + s.voidCount)) * 10000) / 100 : 0;
    const refundRate = s.txnCount > 0
      ? Math.round((overrides.approvedRefunds / s.txnCount) * 10000) / 100 : 0;

    return {
      employeeId:      s._id,
      name:            emp.name            || 'Unknown',
      employeeCode:    emp.employeeCode    || '—',
      role:            emp.role            || 'Employee',
      revenue:         Math.round(s.revenue         * 100) / 100,
      netRevenue:      Math.round(netRevenue         * 100) / 100,
      refundedAmount:  Math.round(s.refundedAmount  * 100) / 100,
      discountTotal:   Math.round(s.discountTotal   * 100) / 100,
      txnCount:        s.txnCount,
      voidCount:       s.voidCount,
      voidRate,
      itemsSold:       s.itemsSold,
      avgTicket,
      revenuePerHour,
      refundRequests:  overrides.refundRequests,
      approvedRefunds: overrides.approvedRefunds,
      deniedRefunds:   overrides.deniedRefunds,
      refundRate,
      hoursWorked:     hours,
      shiftCount:      shifts.shiftCount,
    };
  });

  // Sort by netRevenue descending
  result.sort((a, b) => b.netRevenue - a.netRevenue);

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 6. REFUND ANALYSIS ──────────────────────────────────────────────────────

async function getRefunds({ start, end }) {
  const key = cacheKey('refunds', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const [byReason, byProduct, byEmployee, recent] = await Promise.all([
    ManagerOverride.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          actionType: 'REFUND',
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id:    '$reason',
          count:  { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    ManagerOverride.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          actionType: 'REFUND',
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id:         '$productId',
          productName: { $first: '$productName' },
          sku:         { $first: '$sku' },
          count:       { $sum: 1 },
          amount:      { $sum: '$amount' },
          totalQty:    { $sum: '$requestedQty' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    ManagerOverride.aggregate([
      {
        $match: {
          createdAt: { $gte: s, $lte: e },
          actionType: 'REFUND',
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id:    '$employeeId',
          count:  { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'emp',
        },
      },
      {
        $addFields: {
          name:         { $ifNull: [{ $arrayElemAt: ['$emp.name',         0] }, 'Unknown'] },
          employeeCode: { $ifNull: [{ $arrayElemAt: ['$emp.employeeCode', 0] }, '—'] },
        },
      },
      { $project: { emp: 0 } },
    ]),
    ManagerOverride.find({
      createdAt: { $gte: s, $lte: e },
      actionType: 'REFUND',
      status: 'APPROVED',
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('employeeId', 'name employeeCode')
      .populate('approvedBy', 'name employeeCode')
      .lean(),
  ]);

  const result = { byReason, byProduct, byEmployee, recent };
  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 7. HOURLY HEATMAP ───────────────────────────────────────────────────────

async function getHeatmap({ start, end }) {
  const key = cacheKey('heatmap', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const raw = await Sale.aggregate([
    {
      $match: {
        createdAt: { $gte: s, $lte: e },
        paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
      },
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          dow:  { $dayOfWeek: '$createdAt' }, // 1=Sun…7=Sat
        },
        revenue: { $sum: '$grandTotal' },
        count:   { $sum: 1 },
      },
    },
    { $sort: { '_id.dow': 1, '_id.hour': 1 } },
  ]);

  const result = raw.map(r => ({
    hour:    r._id.hour,
    dow:     r._id.dow,
    revenue: Math.round(r.revenue * 100) / 100,
    count:   r.count,
  }));

  setCached(key, result, ttlFor(end));
  return result;
}

// ─── 8. SHIFT / GROUP SUMMARY ─────────────────────────────────────────────────
// Groups employees into Morning (6–14), Afternoon (14–22), Night (22–6) based
// on their clock-in time during the period.

async function getShiftGroups({ start, end }) {
  const key = cacheKey('shiftGroups', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);

  const shifts = await Shift.find({
    shiftDate: { $gte: s, $lte: e },
  })
    .populate('employeeId', 'name employeeCode role')
    .lean();

  const GROUPS = {
    Morning:   { label: 'Morning Shift',   hours: '6 AM – 2 PM',  hourRange: [6,  14], color: '#EECA3B' },
    Afternoon: { label: 'Afternoon Shift', hours: '2 PM – 10 PM', hourRange: [14, 22], color: '#4C78A8' },
    Night:     { label: 'Night Shift',     hours: '10 PM – 6 AM', hourRange: [22, 30], color: '#72B7B2' },
  };

  // Map each shift to a group by clock-in hour
  const groupMap = { Morning: new Set(), Afternoon: new Set(), Night: new Set() };
  for (const sh of shifts) {
    if (!sh.clockInTime || !sh.employeeId) continue;
    const hour = new Date(sh.clockInTime).getHours();
    if (hour >= 6 && hour < 14)       groupMap.Morning.add(String(sh.employeeId._id));
    else if (hour >= 14 && hour < 22) groupMap.Afternoon.add(String(sh.employeeId._id));
    else                               groupMap.Night.add(String(sh.employeeId._id));
  }

  // For each group, aggregate sales for those employees in the period
  const groupResults = await Promise.all(
    Object.entries(GROUPS).map(async ([key, meta]) => {
      const empIds = [...groupMap[key]].map(id => new mongoose.Types.ObjectId(id));
      if (empIds.length === 0) {
        return { id: key, ...meta, members: [], stats: { revenue: 0, txnCount: 0, avgTicket: 0, hoursWorked: 0 }, weekly: [], topProducts: [] };
      }

      const [salesAgg, shiftAgg, topProducts] = await Promise.all([
        Sale.aggregate([
          {
            $match: {
              employeeId: { $in: empIds },
              createdAt: { $gte: s, $lte: e },
              paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
            },
          },
          {
            $group: {
              _id: null,
              revenue:  { $sum: '$grandTotal' },
              refunded: { $sum: '$refundedAmount' },
              txnCount: { $sum: 1 },
            },
          },
        ]),
        Shift.aggregate([
          {
            $match: {
              employeeId: { $in: empIds },
              shiftDate: { $gte: s, $lte: e },
              status: 'CLOSED',
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
        ]),
        Sale.aggregate([
          {
            $match: {
              employeeId: { $in: empIds },
              createdAt: { $gte: s, $lte: e },
              paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id:         '$items.productId',
              productName: { $first: '$items.productName' },
              sku:         { $first: '$items.sku' },
              revenue:     { $sum: '$items.total' },
              qty:         { $sum: '$items.quantity' },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 3 },
        ]),
      ]);

      const sa  = salesAgg[0]  || { revenue: 0, refunded: 0, txnCount: 0 };
      const sha = shiftAgg[0]  || { totalMinutes: 0 };
      const net = sa.revenue - sa.refunded;
      const hours = Math.round((sha.totalMinutes / 60) * 10) / 10;

      // Fetch employee names + per-employee sales stats
      const [memberDocs, perEmpSales, perEmpOverrides] = await Promise.all([
        User.find({ _id: { $in: empIds } }).select('name employeeCode role').lean(),
        Sale.aggregate([
          {
            $match: {
              employeeId: { $in: empIds },
              createdAt: { $gte: s, $lte: e },
              paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'] },
            },
          },
          {
            $group: {
              _id:            '$employeeId',
              revenue:        { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, '$grandTotal', 0] } },
              refundedAmount: { $sum: '$refundedAmount' },
              txnCount:       { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
              voidCount:      { $sum: { $cond: [{ $eq: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
            },
          },
        ]),
        ManagerOverride.aggregate([
          {
            $match: {
              employeeId: { $in: empIds },
              createdAt: { $gte: s, $lte: e },
              actionType: 'REFUND',
              status: 'APPROVED',
            },
          },
          { $group: { _id: '$employeeId', approvedRefunds: { $sum: 1 } } },
        ]),
      ]);

      const perEmpMap = {};
      for (const e of perEmpSales) perEmpMap[String(e._id)] = e;
      const overrideMap2 = {};
      for (const o of perEmpOverrides) overrideMap2[String(o._id)] = o;

      return {
        id: key,
        ...meta,
        members: memberDocs.map(m => {
          const es  = perEmpMap[String(m._id)]    || { revenue: 0, refundedAmount: 0, txnCount: 0, voidCount: 0 };
          const ov  = overrideMap2[String(m._id)] || { approvedRefunds: 0 };
          const mNet = es.revenue - es.refundedAmount;
          const total = es.txnCount + es.voidCount;
          return {
            employeeId: m._id,
            name:        m.name,
            code:        m.employeeCode,
            role:        m.role,
            netRevenue:  Math.round(mNet * 100) / 100,
            txnCount:    es.txnCount,
            avgTicket:   es.txnCount > 0 ? Math.round((mNet / es.txnCount) * 100) / 100 : 0,
            voidRate:    total > 0 ? Math.round((es.voidCount / total) * 10000) / 100 : 0,
            refundRate:  es.txnCount > 0 ? Math.round((ov.approvedRefunds / es.txnCount) * 10000) / 100 : 0,
          };
        }),
        stats: {
          revenue:     Math.round(net      * 100) / 100,
          txnCount:    sa.txnCount,
          avgTicket:   sa.txnCount > 0 ? Math.round((net / sa.txnCount) * 100) / 100 : 0,
          hoursWorked: hours,
        },
        topProducts: topProducts.map(p => ({
          productName: p.productName,
          sku:         p.sku,
          revenue:     Math.round(p.revenue * 100) / 100,
          qty:         p.qty,
        })),
      };
    })
  );

  setCached(key, groupResults, ttlFor(end));
  return groupResults;
}

// ─── 9. ANOMALY DETECTION ────────────────────────────────────────────────────

async function getAnomalies({ start, end }) {
  const { start: s, end: e } = parseRange(start, end);
  const alerts = [];

  // Build 7-day baseline: same period last week
  const dayMs  = 86400000;
  const weekMs = 7 * dayMs;
  const baseStart = new Date(s.getTime() - weekMs);
  const baseEnd   = new Date(e.getTime() - weekMs);

  const [currentSummary, baselineSummary, refundsPast24h, voidSpike] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: s, $lte: e }, paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, txnCount: { $sum: 1 }, refundedAmount: { $sum: '$refundedAmount' } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: baseStart, $lte: baseEnd }, paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] } } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, txnCount: { $sum: 1 } } },
    ]),
    ManagerOverride.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - dayMs), $lte: new Date() },
          actionType: 'REFUND',
          status: 'APPROVED',
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 1800000), $lte: new Date() }, // last 30 min
          paymentStatus: 'VOIDED',
        },
      },
      { $group: { _id: '$employeeId', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
    ]),
  ]);

  const cur  = currentSummary[0]  || { revenue: 0, txnCount: 0, refundedAmount: 0 };
  const base = baselineSummary[0] || { revenue: 0, txnCount: 0 };
  const refunds24h = refundsPast24h[0] || { count: 0, amount: 0 };

  // Alert 1: Revenue drop >40% vs last week
  if (base.revenue > 0 && cur.revenue < base.revenue * 0.6) {
    alerts.push({
      type: 'REVENUE_DROP',
      severity: 'HIGH',
      title: 'Revenue significantly below last week',
      detail: `Current: $${cur.revenue.toFixed(2)} vs last week: $${base.revenue.toFixed(2)} (${Math.round(((cur.revenue - base.revenue) / base.revenue) * 100)}%)`,
      action: 'review_transactions',
    });
  }

  // Alert 2: High refund count in last 24h
  if (cur.txnCount > 0) {
    const refundRate = (refunds24h.count / Math.max(cur.txnCount, 1)) * 100;
    if (refundRate > 5) {
      alerts.push({
        type: 'HIGH_REFUND_RATE',
        severity: 'HIGH',
        title: `High refund rate: ${refundRate.toFixed(1)}%`,
        detail: `${refunds24h.count} refunds totalling $${refunds24h.amount.toFixed(2)} in last 24 hours`,
        action: 'review_refunds',
      });
    }
  }

  // Alert 3: Void spike in last 30 min
  if (voidSpike.length > 0) {
    const empIds = voidSpike.map(v => v._id).filter(Boolean);
    const emps   = await User.find({ _id: { $in: empIds } }).select('name employeeCode');
    const empMap = {};
    for (const emp of emps) empMap[String(emp._id)] = emp;
    for (const v of voidSpike) {
      const emp = empMap[String(v._id)];
      alerts.push({
        type: 'VOID_SPIKE',
        severity: 'MEDIUM',
        title: `Unusual void activity — ${emp?.name || 'Unknown'}`,
        detail: `${v.count} voids in the last 30 minutes from ${emp?.name || 'Unknown'} (${emp?.employeeCode || '—'})`,
        action: 'review_voids',
      });
    }
  }

  // Alert 4: Transactions below baseline
  if (base.txnCount > 0 && cur.txnCount < base.txnCount * 0.5 && base.txnCount > 5) {
    alerts.push({
      type: 'LOW_TRANSACTIONS',
      severity: 'MEDIUM',
      title: 'Transaction volume below baseline',
      detail: `${cur.txnCount} transactions vs ${base.txnCount} last week`,
      action: 'check_terminals',
    });
  }

  return alerts;
}

// ─── 10. INSIGHTS ENGINE ─────────────────────────────────────────────────────

async function getInsights({ start, end }) {
  const key = cacheKey('insights', { start, end });
  const cached = getCached(key);
  if (cached) return cached;

  const { start: s, end: e } = parseRange(start, end);
  const insights = [];

  const [products, cashiers, summary, payments] = await Promise.all([
    getProducts({ start, end, limit: 20, sortBy: 'revenue' }),
    getCashiers({ start, end }),
    getSummary({ start, end }),
    getPayments({ start, end }),
  ]);

  const cur = summary.current;
  const storeRefundRate = cur.refundRate;

  // Product refund anomaly
  for (const p of products) {
    if (p.refundRate > storeRefundRate * 2.5 && p.qtySold >= 3) {
      insights.push({
        type: 'PRODUCT_RISK',
        priority: 1,
        icon: 'warning',
        title: `High return rate on ${p.productName}`,
        body: `${p.refundRate.toFixed(1)}% refund rate vs ${storeRefundRate.toFixed(1)}% store avg. ${p.refundedQty} of ${p.qtySold} units returned.`,
        action: { label: 'View refunds', filter: { productId: p.productId } },
      });
    }
  }

  // Top cashier praise
  if (cashiers.length > 0) {
    const top = cashiers[0];
    insights.push({
      type: 'PERFORMANCE',
      priority: 3,
      icon: 'star',
      title: `${top.name} leads in net revenue`,
      body: `$${top.netRevenue.toFixed(2)} net revenue, avg ticket $${top.avgTicket.toFixed(2)} this period.`,
      action: { label: 'View details', filter: { cashierId: top.employeeId } },
    });
  }

  // Payment method shift alert
  const cashMethod = payments.methods.find(m => m.method === 'CASH');
  if (cashMethod && cashMethod.share < 15 && cur.txnCount > 10) {
    insights.push({
      type: 'CASH_ALERT',
      priority: 2,
      icon: 'info',
      title: 'Cash transactions unusually low',
      body: `Cash is only ${cashMethod.share}% of payment mix this period. Verify drawer reconciliation.`,
      action: { label: 'View payments', filter: {} },
    });
  }

  // High discount impact
  if (cur.txnCount > 0) {
    const discountRate = cur.grossRevenue > 0 ? (cur.discountTotal / cur.grossRevenue) * 100 : 0;
    if (discountRate > 10) {
      insights.push({
        type: 'DISCOUNT_ALERT',
        priority: 2,
        icon: 'warning',
        title: `Discounts are ${discountRate.toFixed(1)}% of gross revenue`,
        body: `$${cur.discountTotal.toFixed(2)} in discounts applied. Review authorization policy if unexpected.`,
        action: { label: 'View transactions', filter: {} },
      });
    }
  }

  insights.sort((a, b) => a.priority - b.priority);
  setCached(key, insights, ttlFor(end));
  return insights;
}

// ─── 11. CSV EXPORT ──────────────────────────────────────────────────────────

async function exportCSV({ start, end }) {
  const { start: s, end: e } = parseRange(start, end);

  const sales = await Sale.find({
    createdAt: { $gte: s, $lte: e },
    paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'] },
  })
    .populate('employeeId', 'name employeeCode')
    .lean();

  const paymentsBySale = {};
  const payments = await Payment.find({
    createdAt: { $gte: s, $lte: e },
    direction: 'CHARGE',
    status: 'SUCCESS',
  }).lean();
  for (const p of payments) paymentsBySale[String(p.saleId)] = p;

  const rows = [];
  const header = [
    'invoiceNo', 'date', 'time', 'cashierName', 'cashierCode',
    'items', 'subtotal', 'discountTotal', 'taxTotal', 'grandTotal',
    'refundedAmount', 'netAmount', 'paymentMethod', 'paymentStatus',
  ];
  rows.push(header.join(','));

  for (const sale of sales) {
    const dt       = new Date(sale.createdAt);
    const payment  = paymentsBySale[String(sale._id)];
    const items    = sale.items.map(i => `${i.productName}×${i.quantity}`).join('; ');
    const net      = Math.round((sale.grandTotal - (sale.refundedAmount || 0)) * 100) / 100;

    rows.push([
      sale.invoiceNo,
      dt.toLocaleDateString('en-CA'),
      dt.toLocaleTimeString(),
      sale.employeeId?.name        || '',
      sale.employeeId?.employeeCode || '',
      `"${items}"`,
      sale.subtotal       || 0,
      sale.discountTotal  || 0,
      sale.taxTotal       || 0,
      sale.grandTotal     || 0,
      sale.refundedAmount || 0,
      net,
      payment?.method    || '',
      sale.paymentStatus || '',
    ].join(','));
  }

  return rows.join('\n');
}

// ─── Employee Detail Report ──────────────────────────────────────────────────
async function getEmployeeReport({ employeeId, start, end }) {
  const { start: s, end: e } = parseRange(start, end);
  const empObjId = new mongoose.Types.ObjectId(employeeId);

  const [employee, salesAgg, trendAgg, productAgg, paymentAgg, transactions, activity, shifts] = await Promise.all([
    // Employee info
    User.findById(empObjId).select('name employeeCode role email').lean(),

    // KPI aggregation from sales
    Sale.aggregate([
      { $match: { employeeId: empObjId, createdAt: { $gte: s, $lte: e }, paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'] } } },
      { $group: {
        _id: null,
        revenue:        { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, '$grandTotal', 0] } },
        refundedAmount: { $sum: '$refundedAmount' },
        discountTotal:  { $sum: '$discountTotal' },
        txnCount:       { $sum: { $cond: [{ $ne: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
        voidCount:      { $sum: { $cond: [{ $eq: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
        itemsSold:      { $sum: { $sum: '$items.quantity' } },
      } },
    ]),

    // Daily trend
    Sale.aggregate([
      { $match: { employeeId: empObjId, createdAt: { $gte: s, $lte: e }, paymentStatus: { $in: ['PAID', 'PARTIAL', 'REFUNDED'] } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue:  { $sum: { $subtract: ['$grandTotal', '$refundedAmount'] } },
        txnCount: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]),

    // Top products
    Sale.aggregate([
      { $match: { employeeId: empObjId, createdAt: { $gte: s, $lte: e }, paymentStatus: { $in: ['PAID', 'PARTIAL'] } } },
      { $unwind: '$items' },
      { $group: {
        _id:         '$items.productId',
        productName: { $first: '$items.productName' },
        qty:         { $sum: '$items.quantity' },
        revenue:     { $sum: '$items.total' },
        txnCount:    { $sum: 1 },
      } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDoc' } },
      { $addFields: { costPrice: { $ifNull: [{ $arrayElemAt: ['$productDoc.costPrice', 0] }, 0] } } },
      { $project: { productDoc: 0 } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),

    // Payment method breakdown (join Sales → Payments)
    Payment.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: 'saleId',
          foreignField: '_id',
          as: 'sale',
        },
      },
      { $unwind: '$sale' },
      { $match: {
        'sale.employeeId': empObjId,
        'sale.createdAt':  { $gte: s, $lte: e },
        direction:         'CHARGE',
        status:            'SUCCESS',
      } },
      { $group: {
        _id:    '$method',
        amount: { $sum: '$amount' },
        count:  { $sum: 1 },
      } },
      { $sort: { amount: -1 } },
    ]),

    // Recent transactions (last 50)
    Sale.find({ employeeId: empObjId, createdAt: { $gte: s, $lte: e } })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('invoiceNo createdAt grandTotal refundedAmount paymentStatus status items discountTotal')
      .lean(),

    // Audit / activity log (overrides)
    ManagerOverride.find({ employeeId: empObjId, createdAt: { $gte: s, $lte: e } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('approvedBy', 'name')
      .lean(),

    // Shift attendance
    Shift.find({ employeeId: empObjId, shiftDate: { $gte: s, $lte: e } })
      .sort({ shiftDate: -1 })
      .lean(),
  ]);

  if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 });

  const kpiRaw = salesAgg[0] || { revenue: 0, refundedAmount: 0, discountTotal: 0, txnCount: 0, voidCount: 0, itemsSold: 0 };
  const netRevenue = kpiRaw.revenue - kpiRaw.refundedAmount;

  // Override counts
  const overridesAll = activity;
  const overrideCount = overridesAll.length;
  const refundCount   = overridesAll.filter(o => o.actionType === 'REFUND' && o.status === 'APPROVED').length;

  // Shift hours
  const closedShifts  = shifts.filter(sh => sh.status === 'CLOSED' && sh.clockInTime && sh.clockOutTime);
  const totalMinutes  = closedShifts.reduce((acc, sh) => acc + (new Date(sh.clockOutTime) - new Date(sh.clockInTime)) / 60000, 0);
  const hoursWorked   = Math.round((totalMinutes / 60) * 10) / 10;
  const shiftCount    = shifts.length;

  const avgTicket      = kpiRaw.txnCount > 0 ? Math.round((netRevenue / kpiRaw.txnCount) * 100) / 100 : 0;
  const revenuePerHour = hoursWorked > 0 ? Math.round((netRevenue / hoursWorked) * 100) / 100 : 0;
  const txnPerHour     = hoursWorked > 0 ? Math.round((kpiRaw.txnCount / hoursWorked) * 10) / 10 : 0;
  const totalTxns      = kpiRaw.txnCount + kpiRaw.voidCount;
  const voidRate       = totalTxns > 0 ? Math.round((kpiRaw.voidCount / totalTxns) * 10000) / 100 : 0;
  const refundRate     = kpiRaw.txnCount > 0 ? Math.round((refundCount / kpiRaw.txnCount) * 10000) / 100 : 0;

  return {
    employee: { _id: employee._id, name: employee.name, employeeCode: employee.employeeCode, role: employee.role, email: employee.email },
    kpis: {
      revenue:         Math.round(kpiRaw.revenue         * 100) / 100,
      netRevenue:      Math.round(netRevenue              * 100) / 100,
      refundedAmount:  Math.round(kpiRaw.refundedAmount  * 100) / 100,
      discountTotal:   Math.round(kpiRaw.discountTotal   * 100) / 100,
      txnCount:        kpiRaw.txnCount,
      voidCount:       kpiRaw.voidCount,
      voidRate,
      avgTicket,
      revenuePerHour,
      txnPerHour,
      refundCount,
      refundRate,
      overrideCount,
      itemsSold:       kpiRaw.itemsSold,
      hoursWorked,
      shiftCount,
    },
    trend: trendAgg.map(d => ({ date: d._id, revenue: Math.round(d.revenue * 100) / 100, txnCount: d.txnCount })),
    products: productAgg.map(d => {
      const revenue = Math.round(d.revenue * 100) / 100;
      const cost    = Math.round(d.qty * (d.costPrice || 0) * 100) / 100;
      return {
        name:        d.productName,
        productId:   d._id,
        qty:         d.qty,
        revenue,
        txnCount:    d.txnCount,
        cost,
        grossProfit: Math.round((revenue - cost) * 100) / 100,
      };
    }),
    payments: paymentAgg.map(d => ({ method: d._id, amount: Math.round(d.amount * 100) / 100, count: d.count })),
    transactions: transactions.map(t => ({
      id:            t._id,
      invoiceNo:     t.invoiceNo,
      date:          t.createdAt,
      grandTotal:    Math.round(t.grandTotal    * 100) / 100,
      refundedAmount:Math.round((t.refundedAmount || 0) * 100) / 100,
      discountTotal: Math.round((t.discountTotal || 0) * 100) / 100,
      netTotal:      Math.round((t.grandTotal - (t.refundedAmount || 0)) * 100) / 100,
      paymentStatus: t.paymentStatus,
      status:        t.status,
      itemCount:     t.items?.reduce((a, i) => a + i.quantity, 0) || 0,
    })),
    activity: overridesAll.map(o => ({
      id:         o._id,
      date:       o.createdAt,
      actionType: o.actionType,
      status:     o.status,
      reason:     o.reason,
      approvedBy: o.approvedBy?.name || null,
    })),
    shifts: shifts.map(sh => ({
      id:        sh._id,
      date:      sh.shiftDate,
      clockIn:   sh.clockInTime,
      clockOut:  sh.clockOutTime,
      status:    sh.status,
      hours:     (sh.status === 'CLOSED' && sh.clockOutTime)
                   ? Math.round(((new Date(sh.clockOutTime) - new Date(sh.clockInTime)) / 3600000) * 10) / 10
                   : null,
      totalSales:       sh.totalSales || 0,
      totalTransactions: sh.totalTransactions || 0,
    })),
  };
}

export {
  getSummary,
  getTrend,
  getPayments,
  getProducts,
  getCashiers,
  getRefunds,
  getHeatmap,
  getShiftGroups,
  getAnomalies,
  getInsights,
  exportCSV,
  getEmployeeReport,
};
