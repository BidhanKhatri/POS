import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import ManagerOverride from '../models/ManagerOverride.js';

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
  const r = raw[0] || { revenue: 0, transactions: 0, avgTicket: 0, refundedAmount: 0 };
  return {
    revenue:        Number(r.revenue.toFixed(2)),
    transactions:   r.transactions,
    avgTicket:      Number((r.avgTicket || 0).toFixed(2)),
    refundedAmount: Number(r.refundedAmount.toFixed(2)),
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
    const kpi = kpiResult[0] || { revenue: 0, transactions: 0, avgTicket: 0, refundedAmount: 0 };

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
        revenue:          Number(kpi.revenue.toFixed(2)),
        transactions:     kpi.transactions,
        avgTicket:        Number((kpi.avgTicket || 0).toFixed(2)),
        refundedAmount:   Number(kpi.refundedAmount.toFixed(2)),
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
