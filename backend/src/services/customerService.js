import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';

// ── List with pagination + per-row stats aggregation ──────────────────────────
const listCustomers = async ({ page = 1, limit = 25, search = '', startDate = '', endDate = '' } = {}) => {
  const filter = { isActive: true };

  if (search) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = e;
    }
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  if (customers.length === 0) return { customers: [], total: 0, page, pages: 0 };

  const ids = customers.map(c => c._id);
  const stats = await Sale.aggregate([
    { $match: { customerId: { $in: ids }, status: 'COMPLETED' } },
    {
      $group: {
        _id: '$customerId',
        totalOrders:    { $sum: 1 },
        totalSpent:     { $sum: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
        lastVisit:      { $max: '$createdAt' },
      },
    },
  ]);

  const statsMap = Object.fromEntries(stats.map(s => [s._id.toString(), s]));

  const enriched = customers.map(c => {
    const s = statsMap[c._id.toString()] || {};
    return {
      ...c,
      totalOrders:    s.totalOrders    || 0,
      totalSpent:     s.totalSpent     || 0,
      refundedAmount: s.refundedAmount || 0,
      netSpent:       (s.totalSpent || 0) - (s.refundedAmount || 0),
      lastVisit:      s.lastVisit      || null,
    };
  });

  return { customers: enriched, total, page, pages: Math.ceil(total / limit) };
};

// ── Lightweight search for employee terminal picker ───────────────────────────
const searchCustomers = async (q = '') => {
  if (!q || q.trim().length < 1) return [];
  const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return Customer.find({ isActive: true, $or: [{ name: re }, { phone: re }] })
    .select('name phone email')
    .limit(10)
    .lean();
};

// ── Single customer with full aggregated stats ────────────────────────────────
const getCustomerDetail = async (customerId) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer || !customer.isActive) throw new Error('Customer not found');

  const [saleStats] = await Sale.aggregate([
    { $match: { customerId: new mongoose.Types.ObjectId(customerId), status: 'COMPLETED' } },
    {
      $group: {
        _id:            null,
        totalOrders:    { $sum: 1 },
        totalSpent:     { $sum: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
        discountTotal:  { $sum: '$discountTotal' },
        lastVisit:      { $max: '$createdAt' },
        firstVisit:     { $min: '$createdAt' },
      },
    },
  ]);

  const s = saleStats || {};
  return {
    ...customer,
    totalOrders:    s.totalOrders    || 0,
    totalSpent:     s.totalSpent     || 0,
    refundedAmount: s.refundedAmount || 0,
    netSpent:       (s.totalSpent || 0) - (s.refundedAmount || 0),
    discountTotal:  s.discountTotal  || 0,
    lastVisit:      s.lastVisit      || null,
    firstVisit:     s.firstVisit     || null,
  };
};

// ── Purchase history ──────────────────────────────────────────────────────────
const getCustomerPurchases = async (customerId, { page = 1, limit = 20 } = {}) => {
  const filter = { customerId: new mongoose.Types.ObjectId(customerId), status: 'COMPLETED' };
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employeeId', 'name employeeCode')
      .lean(),
    Sale.countDocuments(filter),
  ]);

  const saleIds = sales.map(s => s._id);
  const payments = await Payment.find({
    saleId: { $in: saleIds },
    direction: 'CHARGE',
  }).select('saleId method').lean();

  const payMap = {};
  payments.forEach(p => { if (!payMap[p.saleId.toString()]) payMap[p.saleId.toString()] = p.method; });

  const enriched = sales.map(s => ({
    ...s,
    paymentMethod: payMap[s._id.toString()] || null,
  }));

  return { purchases: enriched, total, page, pages: Math.ceil(total / limit) };
};

// ── Refund history ────────────────────────────────────────────────────────────
const getCustomerRefunds = async (customerId, { page = 1, limit = 20 } = {}) => {
  const filter = {
    customerId:     new mongoose.Types.ObjectId(customerId),
    status:         'COMPLETED',
    refundedAmount: { $gt: 0 },
  };
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Sale.countDocuments(filter),
  ]);

  const saleIds = sales.map(s => s._id);
  const refundPayments = await Payment.find({
    saleId: { $in: saleIds },
    direction: 'REFUND',
  }).lean();

  const refMap = {};
  refundPayments.forEach(p => {
    const sid = p.saleId.toString();
    if (!refMap[sid]) refMap[sid] = [];
    refMap[sid].push(p);
  });

  return {
    refunds: sales.map(s => ({ ...s, refundPayments: refMap[s._id.toString()] || [] })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

// ── Manager analytics ─────────────────────────────────────────────────────────
const getCustomerAnalytics = async ({ startDate = '', endDate = '' } = {}) => {
  const saleMatch = { status: 'COMPLETED', customerId: { $exists: true, $ne: null } };
  if (startDate || endDate) {
    saleMatch.createdAt = {};
    if (startDate) saleMatch.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      saleMatch.createdAt.$lte = e;
    }
  }

  const [totalCustomers, topCustomers, newVsReturningArr, monthlyTrendArr] = await Promise.all([
    Customer.countDocuments({ isActive: true }),

    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id:            '$customerId',
          totalOrders:    { $sum: 1 },
          totalSpent:     { $sum: '$grandTotal' },
          refundedAmount: { $sum: '$refundedAmount' },
          lastVisit:      { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      {
        $project: {
          name:           '$customer.name',
          phone:          '$customer.phone',
          totalOrders:    1,
          totalSpent:     1,
          refundedAmount: 1,
          netSpent:       { $subtract: ['$totalSpent', '$refundedAmount'] },
          lastVisit:      1,
        },
      },
    ]),

    Sale.aggregate([
      { $match: saleMatch },
      { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
      {
        $group: {
          _id:                null,
          newCustomers:       { $sum: { $cond: [{ $eq:  ['$orderCount', 1] }, 1, 0] } },
          returningCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
        },
      },
    ]),

    // New customers per month (last 6 months)
    Customer.aggregate([
      {
        $match: {
          isActive: true,
          createdAt: {
            $gte: (() => {
              const d = new Date();
              d.setMonth(d.getMonth() - 5);
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
          },
        },
      },
      {
        $group: {
          _id:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const nvr = newVsReturningArr[0] || { newCustomers: 0, returningCustomers: 0 };

  return {
    totalCustomers,
    newCustomers:       nvr.newCustomers,
    returningCustomers: nvr.returningCustomers,
    topCustomers,
    monthlyTrend:       monthlyTrendArr,
  };
};

// ── Auto-upsert a customer from Payment.buyer data ────────────────────────────
// Called after every sale commits (processSale / completeSale).
// Phone is the primary identity key; email is the fallback.
// If neither is present we cannot deduplicate reliably, so we skip.
const upsertCustomerFromBuyer = async (buyer) => {
  if (!buyer || !buyer.name?.trim()) return null;

  const name  = buyer.name.trim();
  const phone = buyer.phone?.trim()  || null;
  const email = buyer.email?.trim()?.toLowerCase() || null;

  const filter = phone  ? { phone,  isActive: true }
    :            email  ? { email,  isActive: true }
    :                     null;

  if (!filter) return null; // No unique key available

  const setData = { name };
  if (phone) setData.phone = phone;
  if (email) setData.email = email;

  const customer = await Customer.findOneAndUpdate(
    filter,
    { $set: setData },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return customer._id;
};

// ── One-time backfill: link existing sales to customers ───────────────────────
// Iterates all completed sales without a customerId, finds their Payment.buyer,
// and creates/links Customer records. Safe to run multiple times (idempotent).
const backfillCustomersFromPayments = async () => {
  let processed = 0;
  let linked    = 0;

  const cursor = Sale.find({
    customerId: { $exists: false },
    $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }],
  }).select('_id').lean().cursor();

  for await (const { _id } of cursor) {
    processed++;
    try {
      const payment = await Payment.findOne({ saleId: _id, direction: 'CHARGE' });
      if (payment?.buyer?.name?.trim()) {
        const customerId = await upsertCustomerFromBuyer(payment.buyer);
        if (customerId) {
          await Sale.findByIdAndUpdate(_id, { customerId });
          linked++;
        }
      }
    } catch { /* skip problem rows, keep going */ }
  }

  return { processed, linked };
};

const updateCustomer = async (customerId, { name, phone, email, notes }) => {
  const data = {};
  if (name  !== undefined) data.name  = name.trim();
  if (phone !== undefined) data.phone = phone.trim() || undefined;
  if (email !== undefined) data.email = email.trim()?.toLowerCase() || undefined;
  if (notes !== undefined) data.notes = notes.trim() || undefined;

  if (data.phone) {
    const conflict = await Customer.findOne({
      phone: data.phone,
      _id:   { $ne: customerId },
      isActive: true,
    });
    if (conflict) throw new Error('Phone number already registered to another customer');
  }

  const updated = await Customer.findByIdAndUpdate(customerId, data, { new: true });
  if (!updated) throw new Error('Customer not found');
  return updated;
};

const deleteCustomer = async (customerId) => {
  const c = await Customer.findByIdAndUpdate(customerId, { isActive: false }, { new: true });
  if (!c) throw new Error('Customer not found');
  return c;
};

export {
  listCustomers, searchCustomers, getCustomerDetail,
  getCustomerPurchases, getCustomerRefunds, getCustomerAnalytics,
  updateCustomer, deleteCustomer,
  upsertCustomerFromBuyer, backfillCustomersFromPayments,
};
