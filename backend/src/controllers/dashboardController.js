import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import ManagerOverride from '../models/ManagerOverride.js';
import Shift from '../models/Shift.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

// Utility: UTC day boundaries for a given date (defaults to today)
function dayBounds(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Period aggregation helper — returns { revenue, transactions, avgTicket, refundedAmount }
function periodAgg(employeeId, start, end) {
  const match = { employeeId, status: 'COMPLETED' };
  if (start) match.createdAt = { $gte: start, ...(end ? { $lte: end } : {}) };
  return Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id:            null,
        revenue:        { $sum: '$grandTotal' },
        transactions:   { $sum: 1 },
        avgTicket:      { $avg: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
      },
    },
  ]);
}

function shapePeriod(raw) {
  const r = raw[0] || {};
  return {
    revenue:        Number((r.revenue        ?? 0).toFixed(2)),
    transactions:   r.transactions ?? 0,
    avgTicket:      Number((r.avgTicket      ?? 0).toFixed(2)),
    refundedAmount: Number((r.refundedAmount ?? 0).toFixed(2)),
  };
}

export const employeeDashboard = async (req, res, next) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.user._id);
    const { start: todayStart, end: todayEnd } = dayBounds(0);

    // Last-7-days chart window
    const chartWeekStart = new Date(todayStart);
    chartWeekStart.setDate(chartWeekStart.getDate() - 6);

    // Calendar week (Monday → today)
    const calWeekStart = new Date(todayStart);
    const dow = calWeekStart.getDay(); // 0=Sun
    calWeekStart.setDate(calWeekStart.getDate() - (dow === 0 ? 6 : dow - 1));

    // Calendar month (1st → today)
    const calMonthStart = new Date(todayStart);
    calMonthStart.setDate(1);

    // Calendar year (Jan 1 → today)
    const calYearStart = new Date(todayStart);
    calYearStart.setMonth(0, 1);

    // ── Run all aggregations in parallel ─────────────────────────────────────
    const [
      kpiResult,
      pendingCount,
      hourlyRaw,
      weeklyRaw,
      recentSales,
      recentOverrides,
      topProductsRaw,
      paymentMethodsRaw,
      weekPeriodRaw,
      monthPeriodRaw,
      yearPeriodRaw,
      overallPeriodRaw,
    ] = await Promise.all([

      // 1. Today KPIs: revenue, transactions, avg ticket, refunded amount
      Sale.aggregate([
        {
          $match: {
            employeeId,
            status: 'COMPLETED',
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            revenue:        { $sum: '$grandTotal' },
            transactions:   { $sum: 1 },
            avgTicket:      { $avg: '$grandTotal' },
            refundedAmount: { $sum: '$refundedAmount' },
          },
        },
      ]),

      // 2. Pending override requests
      ManagerOverride.countDocuments({ employeeId, status: 'PENDING' }),

      // 3. Hourly sales today (0-23)
      Sale.aggregate([
        {
          $match: {
            employeeId,
            status: 'COMPLETED',
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id:     { $hour: '$createdAt' },
            revenue: { $sum: '$grandTotal' },
            count:   { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 4. Weekly trend — last 7 days
      Sale.aggregate([
        {
          $match: {
            employeeId,
            status: 'COMPLETED',
            createdAt: { $gte: chartWeekStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$grandTotal' },
            count:   { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 5. Recent 6 completed sales
      Sale.find({ employeeId, status: 'COMPLETED' })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('invoiceNo grandTotal createdAt items paymentStatus refundedAmount')
        .lean(),

      // 6. Recent 6 override requests
      ManagerOverride.find({ employeeId })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('actionType status amount productName sku createdAt')
        .lean(),

      // 7. Top 5 products today (by revenue)
      Sale.aggregate([
        {
          $match: {
            employeeId,
            status: 'COMPLETED',
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id:     '$items.productId',
            name:    { $first: '$items.productName' },
            sku:     { $first: '$items.sku' },
            qty:     { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      // 9–12. Period summaries
      periodAgg(employeeId, calWeekStart,  todayEnd),
      periodAgg(employeeId, calMonthStart, todayEnd),
      periodAgg(employeeId, calYearStart,  todayEnd),
      periodAgg(employeeId, null,          null),

      // 8. Payment method breakdown today
      Payment.aggregate([
        {
          $match: {
            direction: 'CHARGE',
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $lookup: {
            from:         'sales',
            localField:   'saleId',
            foreignField: '_id',
            as:           'sale',
          },
        },
        { $unwind: '$sale' },
        {
          $match: {
            'sale.employeeId': employeeId,
            'sale.status':     'COMPLETED',
          },
        },
        {
          $group: {
            _id:   '$method',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    // ── Shape KPIs ────────────────────────────────────────────────────────────
    const kpi = kpiResult[0] ?? {};

    // ── Shape hourly — fill all 24 slots ─────────────────────────────────────
    const hourlyMap = Object.fromEntries(hourlyRaw.map((h) => [h._id, h]));
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour:    h,
      revenue: hourlyMap[h]?.revenue ?? 0,
      count:   hourlyMap[h]?.count   ?? 0,
    }));

    // ── Shape weekly — fill last 7 dates ─────────────────────────────────────
    const weeklyMap = Object.fromEntries(weeklyRaw.map((w) => [w._id, w]));
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(chartWeekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return {
        date:    key,
        label:   d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: weeklyMap[key]?.revenue ?? 0,
        count:   weeklyMap[key]?.count   ?? 0,
      };
    });

    res.json({
      kpi: {
        revenue:          Number((kpi.revenue        ?? 0).toFixed(2)),
        transactions:     kpi.transactions     ?? 0,
        avgTicket:        Number((kpi.avgTicket      ?? 0).toFixed(2)),
        refundedAmount:   Number((kpi.refundedAmount ?? 0).toFixed(2)),
        pendingApprovals: pendingCount,
      },
      periods: {
        weekly:  shapePeriod(weekPeriodRaw),
        monthly: shapePeriod(monthPeriodRaw),
        yearly:  shapePeriod(yearPeriodRaw),
        overall: shapePeriod(overallPeriodRaw),
      },
      charts: { hourly, weekly },
      activity: {
        recentSales:     recentSales,
        recentOverrides: recentOverrides,
      },
      insights: {
        topProducts:    topProductsRaw,
        paymentMethods: paymentMethodsRaw,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Manager-wide dashboard ─────────────────────────────────────────────────────
// GET /api/dashboard/manager?period=today|week|month|year|custom&start=&end=
export const managerDashboard = async (req, res, next) => {
  try {
    const { period = 'today', start: qStart, end: qEnd } = req.query;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    let rangeStart, rangeEnd, prevStart, prevEnd, groupBy;

    switch (period) {
      case 'all_time': {
        rangeStart = null; // no lower bound
        rangeEnd   = todayEnd;
        prevStart  = null;
        prevEnd    = null;
        groupBy    = 'year';
        break;
      }
      case 'week': {
        rangeStart = new Date(todayStart); rangeStart.setDate(rangeStart.getDate() - 6);
        rangeEnd   = todayEnd;
        prevEnd    = new Date(rangeStart); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
        prevStart  = new Date(prevEnd);    prevStart.setDate(prevStart.getDate() - 6); prevStart.setHours(0, 0, 0, 0);
        groupBy    = 'day';
        break;
      }
      case 'month': {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd   = todayEnd;
        prevEnd    = new Date(rangeStart); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
        prevStart  = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
        groupBy    = 'day';
        break;
      }
      case 'year': {
        rangeStart = new Date(now.getFullYear(), 0, 1);
        rangeEnd   = todayEnd;
        prevStart  = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd    = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        groupBy    = 'month';
        break;
      }
      case 'custom': {
        if (!qStart || !qEnd) return res.status(400).json({ message: 'start and end required for custom period' });
        rangeStart = new Date(qStart); rangeStart.setHours(0, 0, 0, 0);
        rangeEnd   = new Date(qEnd);   rangeEnd.setHours(23, 59, 59, 999);
        const daySpan = Math.max(1, Math.round((rangeEnd - rangeStart) / 86400000));
        prevEnd    = new Date(rangeStart); prevEnd.setDate(prevEnd.getDate() - 1); prevEnd.setHours(23, 59, 59, 999);
        prevStart  = new Date(prevEnd);    prevStart.setDate(prevStart.getDate() - daySpan); prevStart.setHours(0, 0, 0, 0);
        groupBy    = daySpan <= 1 ? 'hour' : daySpan <= 60 ? 'day' : 'month';
        break;
      }
      default: { // today
        rangeStart = todayStart;
        rangeEnd   = todayEnd;
        prevStart  = new Date(todayStart); prevStart.setDate(prevStart.getDate() - 1);
        prevEnd    = new Date(todayEnd);   prevEnd.setDate(prevEnd.getDate() - 1);
        groupBy    = 'hour';
      }
    }

    const saleMatch     = rangeStart
      ? { createdAt: { $gte: rangeStart, $lte: rangeEnd }, status: 'COMPLETED' }
      : { status: 'COMPLETED' };
    const prevSaleMatch = prevStart && prevEnd
      ? { createdAt: { $gte: prevStart, $lte: prevEnd }, status: 'COMPLETED' }
      : { createdAt: { $lt: new Date(0) }, status: 'COMPLETED' }; // empty set — no prev period for all_time

    const chartGroupId =
      groupBy === 'hour'  ? { $hour: '$createdAt' } :
      groupBy === 'year'  ? { $dateToString: { format: '%Y',    date: '$createdAt' } } :
      groupBy === 'month' ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } } :
                            { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [
      kpiResult,
      prevKpiResult,
      voidCount,
      activeShifts,
      newCustomers,
      pendingOverrides,
      chartRaw,
      paymentMethodsRaw,
      topEmployeesRaw,
      topProductsRaw,
      slowProductsRaw,
      recentOverridesRaw,
      lowStockRaw,
      outOfStockRaw,
    ] = await Promise.all([

      // 1. Store-wide KPIs — current period
      Sale.aggregate([
        { $match: saleMatch },
        { $group: {
          _id: null,
          grossRevenue:   { $sum: '$grandTotal' },
          refundedAmount: { $sum: '$refundedAmount' },
          discountTotal:  { $sum: '$discountTotal' },
          taxTotal:       { $sum: '$taxTotal' },
          transactions:   { $sum: 1 },
        }},
        { $addFields: {
          netRevenue: { $subtract: ['$grossRevenue', '$refundedAmount'] },
          avgTicket: { $cond: [{ $gt: ['$transactions', 0] }, { $divide: ['$grossRevenue', '$transactions'] }, 0] },
        }},
      ]),

      // 2. Prior period KPIs (for % change)
      Sale.aggregate([
        { $match: prevSaleMatch },
        { $group: {
          _id: null,
          grossRevenue: { $sum: '$grandTotal' },
          transactions: { $sum: 1 },
          avgTicket:    { $avg: '$grandTotal' },
        }},
      ]),

      // 3. Void count
      Sale.countDocuments(rangeStart
        ? { createdAt: { $gte: rangeStart, $lte: rangeEnd }, status: 'VOIDED' }
        : { status: 'VOIDED' }),

      // 4. Active shifts right now
      Shift.find({ status: 'OPEN' })
        .populate('employeeId', 'name role employeeCode')
        .sort({ clockInTime: 1 })
        .limit(10)
        .lean(),

      // 5. New customers in period
      Customer.countDocuments(rangeStart
        ? { createdAt: { $gte: rangeStart, $lte: rangeEnd } }
        : {}),

      // 6. Pending overrides
      ManagerOverride.countDocuments({ status: 'PENDING' }),

      // 7. Revenue + transaction chart
      Sale.aggregate([
        { $match: saleMatch },
        { $group: {
          _id:     chartGroupId,
          revenue: { $sum: '$grandTotal' },
          count:   { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // 8. Payment methods breakdown
      Payment.aggregate([
        { $match: rangeStart
            ? { direction: 'CHARGE', createdAt: { $gte: rangeStart, $lte: rangeEnd } }
            : { direction: 'CHARGE' } },
        { $lookup: { from: 'sales', localField: 'saleId', foreignField: '_id', as: 'sale' } },
        { $unwind: '$sale' },
        { $match: { 'sale.status': 'COMPLETED' } },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),

      // 9. Top 5 employees by revenue
      Sale.aggregate([
        { $match: saleMatch },
        { $group: {
          _id:          '$employeeId',
          revenue:      { $sum: '$grandTotal' },
          transactions: { $sum: 1 },
          avgTicket:    { $avg: '$grandTotal' },
        }},
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'emp' } },
        { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1, revenue: 1, transactions: 1, avgTicket: 1,
          name: '$emp.name', role: '$emp.role', code: '$emp.employeeCode',
        }},
      ]),

      // 10. Top 5 products by revenue
      Sale.aggregate([
        { $match: saleMatch },
        { $unwind: '$items' },
        { $group: {
          _id:     '$items.productId',
          name:    { $first: '$items.productName' },
          sku:     { $first: '$items.sku' },
          qty:     { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        }},
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      // 11. Slow-moving products this month
      Sale.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lte: todayEnd }, status: 'COMPLETED' } },
        { $unwind: '$items' },
        { $group: {
          _id:     '$items.productId',
          name:    { $first: '$items.productName' },
          sku:     { $first: '$items.sku' },
          qty:     { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        }},
        { $sort: { revenue: 1 } },
        { $limit: 3 },
      ]),

      // 12. Recent 8 overrides
      ManagerOverride.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('employeeId', 'name employeeCode')
        .select('actionType status amount productName sku invoiceNo createdAt employeeId')
        .lean(),

      // 13. Low-stock products (1–10)
      Product.find({ isActive: true, stockQty: { $gt: 0, $lte: 10 } })
        .sort({ stockQty: 1 })
        .limit(5)
        .select('name sku stockQty')
        .lean(),

      // 14. Out-of-stock products
      Product.find({ isActive: true, stockQty: { $lte: 0 } })
        .sort({ name: 1 })
        .limit(5)
        .select('name sku stockQty')
        .lean(),
    ]);

    // ── Shape KPIs ─────────────────────────────────────────────────────────────
    const kpi  = kpiResult[0]     ?? {};
    const prev = prevKpiResult[0] ?? {};

    const pct = (curr, prior) => {
      if (!prior) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prior) / prior) * 100);
    };

    // ── Shape chart ────────────────────────────────────────────────────────────
    let chartLabels = [], chartRevenue = [], chartCount = [];

    if (groupBy === 'hour') {
      const map = Object.fromEntries(chartRaw.map((r) => [r._id, r]));
      for (let h = 0; h < 24; h++) {
        chartLabels.push(`${h}:00`);
        chartRevenue.push(+(map[h]?.revenue ?? 0).toFixed(2));
        chartCount.push(map[h]?.count ?? 0);
      }
    } else if (groupBy === 'year') {
      // all_time — return raw yearly buckets sorted ascending
      for (const r of chartRaw) {
        chartLabels.push(r._id);
        chartRevenue.push(+(r.revenue ?? 0).toFixed(2));
        chartCount.push(r.count ?? 0);
      }
    } else if (groupBy === 'day') {
      const map  = Object.fromEntries(chartRaw.map((r) => [r._id, r]));
      const days = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
      for (let i = 0; i < days; i++) {
        const d   = new Date(rangeStart); d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        chartLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        chartRevenue.push(+(map[key]?.revenue ?? 0).toFixed(2));
        chartCount.push(map[key]?.count ?? 0);
      }
    } else {
      // monthly — fill 12 slots from range start
      const map = Object.fromEntries(chartRaw.map((r) => [r._id, r]));
      for (let i = 0; i < 12; i++) {
        const d   = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
        if (d > rangeEnd) break;
        const key = d.toISOString().slice(0, 7);
        chartLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        chartRevenue.push(+(map[key]?.revenue ?? 0).toFixed(2));
        chartCount.push(map[key]?.count ?? 0);
      }
    }

    res.json({
      period,
      kpi: {
        grossRevenue:    +(kpi.grossRevenue   ?? 0).toFixed(2),
        netRevenue:      +(kpi.netRevenue     ?? 0).toFixed(2),
        transactions:     kpi.transactions   ?? 0,
        avgTicket:       +(kpi.avgTicket      ?? 0).toFixed(2),
        refundedAmount:  +(kpi.refundedAmount ?? 0).toFixed(2),
        discountTotal:   +(kpi.discountTotal  ?? 0).toFixed(2),
        taxTotal:        +(kpi.taxTotal       ?? 0).toFixed(2),
        voidCount,
        activeEmployees:  activeShifts.length,
        newCustomers,
        pendingOverrides,
        revenueChange:   pct(kpi.grossRevenue   ?? 0, prev.grossRevenue ?? 0),
        txnChange:       pct(kpi.transactions   ?? 0, prev.transactions  ?? 0),
        avgTicketChange: pct(kpi.avgTicket       ?? 0, prev.avgTicket    ?? 0),
      },
      chart: { labels: chartLabels, revenue: chartRevenue, transactions: chartCount },
      paymentMethods:  paymentMethodsRaw,
      topEmployees:    topEmployeesRaw.map((e) => ({
        ...e,
        revenue:   +(e.revenue   ?? 0).toFixed(2),
        avgTicket: +(e.avgTicket ?? 0).toFixed(2),
      })),
      topProducts:     topProductsRaw.map((p) => ({ ...p, revenue: +(p.revenue ?? 0).toFixed(2) })),
      slowProducts:    slowProductsRaw.map((p) => ({ ...p, revenue: +(p.revenue ?? 0).toFixed(2) })),
      inventory:       { lowStock: lowStockRaw, outOfStock: outOfStockRaw },
      activeShifts:    activeShifts.map((s) => ({
        _id:         s._id,
        clockInTime: s.clockInTime,
        totalSales:  s.totalSales,
        totalTxn:    s.totalTransactions,
        employee:    s.employeeId,
      })),
      recentOverrides: recentOverridesRaw,
    });
  } catch (err) {
    next(err);
  }
};
