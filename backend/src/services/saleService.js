import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';
import ManagerOverride from '../models/ManagerOverride.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { upsertCustomerFromBuyer } from './customerService.js';

const generateInvoiceNo = () => {
  return 'INV-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
};

const CARD_METHODS = ['CREDIT', 'DEBIT'];

// Builds the safe-to-persist payment payload. Buyer contact info is accepted for every
// method so a refund can be traced back to the person. For card payments only a masked
// reference (brand + last 4) is accepted — raw PAN/CVV/expiry are never read or stored,
// even if a caller sends them, to stay clear of PCI-DSS cardholder-data scope.
const buildPaymentRecord = (saleId, p) => {
  if (!p.buyer || !p.buyer.name || !p.buyer.name.trim()) {
    throw new Error('Buyer name is required for every payment');
  }

  const record = {
    saleId,
    method: p.method,
    amount: p.amount,
    referenceNo: p.referenceNo,
    status: 'SUCCESS',
    buyer: {
      name: p.buyer.name.trim(),
      phone: p.buyer.phone ? p.buyer.phone.trim() : undefined,
      email: p.buyer.email ? p.buyer.email.trim() : undefined,
    },
  };

  if (CARD_METHODS.includes(p.method)) {
    const last4 = p.card && p.card.last4 ? String(p.card.last4).trim() : '';
    if (!/^\d{4}$/.test(last4)) {
      throw new Error(`A valid 4-digit card last4 is required for ${p.method} payments`);
    }
    record.card = { brand: p.card.brand || 'OTHER', last4 };
  }

  return record;
};

const processSale = async (employeeId, shiftId, items, payments, discountTotal = 0, discountOverrideId = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 0. Validate + build payment records up front (cheap, sync) so bad buyer/card
    // input fails fast before any stock or sale data is touched.
    const paymentRecords = payments.map((p) => buildPaymentRecord(null, p));

    // Check whether stock tracking is active for this store.
    const _setting = await Setting.findById('global');
    const stockTracking = _setting?.stockTrackingEnabled ?? true;

    // 1. Calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (let item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }

      if (stockTracking && product.stockQty < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      // Variable-price items (e.g. lottery/fuel) pass unitPrice from the dollar-entry pad;
      // catalog sales fall back to the product's stored price.
      const unitPrice = item.unitPrice != null ? item.unitPrice : product.price;
      const total = (unitPrice * item.quantity) - (item.discount || 0);
      subtotal += total;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        unitPrice,
        quantity: item.quantity,
        discount: item.discount || 0,
        total,
      });

      if (stockTracking) {
        // Update product stock
        const beforeQty = product.stockQty;
        product.stockQty -= item.quantity;
        await product.save({ session });

        // Queue inventory movement (created later with saleId)
        item._inventoryData = {
          productId: product._id,
          movementType: 'SALE',
          quantity: -item.quantity,
          beforeQty,
          afterQty: product.stockQty,
        };
      }
    }

    const taxTotal = 0; // Simplified for now
    const grandTotal = subtotal - discountTotal + taxTotal;

    // 2. Validate payments match grandTotal
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentTotal < grandTotal) {
      throw new Error(`Insufficient payment. Expected ${grandTotal}, got ${paymentTotal}`);
    }

    // 3. Create Sale
    const sale = new Sale({
      invoiceNo: generateInvoiceNo(),
      shiftId,
      employeeId,
      items: saleItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paymentStatus: 'PAID',
    });

    await sale.save({ session });

    // 4. Create Payments
    for (let record of paymentRecords) {
      const payment = new Payment({ ...record, saleId: sale._id });
      await payment.save({ session });
    }

    // 5. Create Inventory Movements (skipped when stock tracking is disabled)
    if (stockTracking) {
      for (let item of items) {
        if (item._inventoryData) {
          const movement = new InventoryMovement({
            ...item._inventoryData,
            referenceId: sale._id,
            referenceType: 'Sale',
            createdBy: employeeId,
          });
          await movement.save({ session });
        }
      }
    }

    // 6. Update Shift totals (skipped when the employee has no open shift)
    if (shiftId) {
      const shift = await Shift.findById(shiftId).session(session);
      if (shift && shift.status === 'OPEN') {
        shift.totalSales += grandTotal;
        shift.totalTransactions += 1;
        await shift.save({ session });
      }
    }

    // 7. Create Audit Log
    const auditLog = new AuditLog({
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: sale._id,
      afterData: { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal },
      performedBy: employeeId,
      role: 'Employee', // Normally from token, simplified here
    });
    await auditLog.save({ session });

    // 8. Stamp the discount override as completed so OverridesPage can distinguish
    //    "approved-not-yet-paid" from "fully finalized". No-op if no override linked.
    if (discountOverrideId) {
      await ManagerOverride.findByIdAndUpdate(
        discountOverrideId,
        { $set: { completedSaleId: sale._id, completedAt: new Date() } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Auto-link customer from buyer info — runs outside the transaction so a
    // failure here never rolls back the sale.
    try {
      const primaryBuyer = payments[0]?.buyer;
      if (primaryBuyer?.name?.trim()) {
        const customerId = await upsertCustomerFromBuyer(primaryBuyer);
        if (customerId) await Sale.findByIdAndUpdate(sale._id, { customerId });
      }
    } catch (e) {
      console.warn('[customer-link] processSale skipped:', e.message);
    }

    return sale;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Invoice lookup for the refund flow — search by invoice number or buyer phone
// (buyer contact lives on Payment, not Sale, so phone search joins through it).
// productName/amount are the context carried over from the terminal (what was
// typed/picked before pressing "Refund Product") — matched against the same
// line item via $elemMatch so the search narrows to sales that actually
// contain that product at that price, not just any sale with either fact.
const searchSales = async (employeeId, { invoiceNo, buyerPhone, productName, amount }) => {
  let saleIds = null;

  if (buyerPhone && buyerPhone.trim()) {
    const payments = await Payment.find({
      'buyer.phone': { $regex: buyerPhone.trim(), $options: 'i' },
    }).select('saleId');
    saleIds = payments.map((p) => p.saleId);
    if (saleIds.length === 0) return [];
  }

  const filter = { paymentStatus: { $in: ['PAID', 'PARTIAL'] } };
  if (invoiceNo && invoiceNo.trim()) {
    filter.invoiceNo = { $regex: invoiceNo.trim(), $options: 'i' };
  }
  if (saleIds) {
    filter._id = { $in: saleIds };
  }

  const numericAmount = amount != null && amount !== '' ? Number(amount) : null;
  if ((productName && productName.trim()) || (numericAmount != null && !Number.isNaN(numericAmount))) {
    const elemMatch = {};
    if (productName && productName.trim()) {
      elemMatch.productName = { $regex: productName.trim(), $options: 'i' };
    }
    if (numericAmount != null && !Number.isNaN(numericAmount)) {
      // Small tolerance for floating point/partial-refund rounding.
      elemMatch.total = { $gte: numericAmount - 0.01, $lte: numericAmount + 0.01 };
    }
    filter.items = { $elemMatch: elemMatch };
  }

  return await Sale.find(filter)
    .sort({ createdAt: -1 })
    .limit(25)
    .populate('employeeId', 'name employeeCode');
};

const getSaleDetail = async (saleId) => {
  const sale = await Sale.findById(saleId).populate('employeeId', 'name employeeCode');
  if (!sale) throw new Error('Sale not found');

  const payments = await Payment.find({ saleId: sale._id, direction: { $ne: 'REFUND' } });
  return { sale, payments };
};

/**
 * Paginated transaction list, role-aware.
 * - Employees: see only their own sales.
 * - Managers / Admins: see all sales, can filter by employeeId.
 *
 * Returned shape per record:
 *   { sale fields… , primaryPayment: { method, buyer, card } | null, employee: { name, employeeCode } | null }
 */
const listTransactions = async (requestingUser, {
  page = 1,
  limit = 20,
  search = '',       // matches invoiceNo OR buyer name (via Payment join)
  method = '',       // CASH | CREDIT | DEBIT | MISC
  status = '',       // PAID | PARTIAL | REFUNDED | VOIDED
  startDate = '',
  endDate = '',
  employeeId = '',   // manager only — filter by a specific employee
} = {}) => {
  const isPrivileged = requestingUser.role === 'Manager' || requestingUser.role === 'Admin';

  // ── Build sale-level filter ──────────────────────────────────────────────
  const saleFilter = {
    // Exclude discount override sales that are still in-flight or voided.
    // Pre-status-system sales have no `status` field — they are always shown.
    $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }],
  };

  if (!isPrivileged) {
    // Employees always scoped to their own sales
    saleFilter.employeeId = requestingUser._id;
  } else if (employeeId) {
    saleFilter.employeeId = new mongoose.Types.ObjectId(employeeId);
  }

  if (status) saleFilter.paymentStatus = status;

  if (startDate || endDate) {
    saleFilter.createdAt = {};
    if (startDate) saleFilter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      saleFilter.createdAt.$lte = end;
    }
  }

  // ── Invoice-number search (direct on sale) ───────────────────────────────
  let saleIdSubset = null;
  if (search.trim()) {
    // Check if the search string could be a buyer-name match (join through Payment)
    const matchingPayments = await Payment.find({
      'buyer.name': { $regex: search.trim(), $options: 'i' },
    }).select('saleId').lean();
    const paymentSaleIds = matchingPayments.map((p) => p.saleId.toString());

    // Sales matching the invoice search
    const invoiceSales = await Sale.find({
      invoiceNo: { $regex: search.trim(), $options: 'i' },
    }).select('_id').lean();
    const invoiceSaleIds = invoiceSales.map((s) => s._id.toString());

    // Union of both, deduplicated
    const unionIds = [...new Set([...paymentSaleIds, ...invoiceSaleIds])];
    if (unionIds.length === 0) return { transactions: [], total: 0, page, pages: 0 };
    saleIdSubset = unionIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  if (saleIdSubset) saleFilter._id = { $in: saleIdSubset };

  // ── Method filter requires joining through Payment ───────────────────────
  if (method) {
    const methodPayments = await Payment.find({
      method,
      direction: { $ne: 'REFUND' },
      ...(saleIdSubset ? { saleId: { $in: saleIdSubset } } : {}),
    }).select('saleId').lean();
    const methodSaleIds = [...new Set(methodPayments.map((p) => p.saleId.toString()))];
    if (methodSaleIds.length === 0) return { transactions: [], total: 0, page, pages: 0 };
    saleFilter._id = { $in: methodSaleIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const skip = (page - 1) * limit;
  const [total, sales] = await Promise.all([
    Sale.countDocuments(saleFilter),
    Sale.find(saleFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employeeId', 'name employeeCode')
      .lean(),
  ]);

  if (sales.length === 0) return { transactions: [], total, page, pages: Math.ceil(total / limit) };

  // ── Attach primary payment (one query for all fetched sales) ─────────────
  const saleIds = sales.map((s) => s._id);
  const payments = await Payment.find({
    saleId: { $in: saleIds },
    direction: { $ne: 'REFUND' },
  }).lean();

  const paymentBySale = {};
  for (const p of payments) {
    const key = p.saleId.toString();
    if (!paymentBySale[key]) paymentBySale[key] = p; // first payment wins
  }

  const transactions = sales.map((s) => ({
    ...s,
    primaryPayment: paymentBySale[s._id.toString()] ?? null,
    employee: s.employeeId ?? null,
    employeeId: s.employeeId?._id ?? s.employeeId,
  }));

  return { transactions, total, page, pages: Math.ceil(total / limit) };
};

// Finalize an APPROVED discount-override Sale: decrement stock, record payments,
// flip status to COMPLETED. Called via POST /api/sales/:saleId/complete.
// The Sale document already exists (created as PENDING_APPROVAL at override
// submission) — this function performs all the side-effects that processSale
// would have done, but operates on the pre-existing Sale rather than creating one.
const completeSale = async (employeeId, saleId, shiftId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({ _id: saleId, status: 'APPROVED' }).session(session);
    if (!sale) throw new Error('Sale not found or not in APPROVED state');
    if (String(sale.employeeId) !== String(employeeId)) {
      throw new Error('You are not authorized to complete this sale');
    }

    const _setting2 = await Setting.findById('global');
    const stockTracking2 = _setting2?.stockTrackingEnabled ?? true;

    // Decrement stock + record inventory movements for each item (skipped when tracking disabled)
    if (stockTracking2) {
      for (const item of sale.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product || !product.isActive) {
          throw new Error(`Product ${item.productName} not found or inactive`);
        }
        if (product.stockQty < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const beforeQty = product.stockQty;
        product.stockQty -= item.quantity;
        await product.save({ session });

        await InventoryMovement.create([{
          productId:     product._id,
          movementType:  'SALE',
          quantity:      -item.quantity,
          beforeQty,
          afterQty:      product.stockQty,
          referenceId:   sale._id,
          referenceType: 'Sale',
          createdBy:     employeeId,
        }], { session });
      }
    }

    // Finalize the Sale document
    sale.status        = 'COMPLETED';
    sale.paymentStatus = 'PAID';
    if (shiftId) sale.shiftId = shiftId;
    await sale.save({ session });

    // Stamp the linked ManagerOverride as completed
    await ManagerOverride.findOneAndUpdate(
      { saleId: sale._id },
      { $set: { completedSaleId: sale._id, completedAt: new Date() } },
      { session }
    );

    // Update Shift totals
    if (shiftId) {
      const shift = await Shift.findById(shiftId).session(session);
      if (shift && shift.status === 'OPEN') {
        shift.totalSales        += sale.grandTotal;
        shift.totalTransactions += 1;
        await shift.save({ session });
      }
    }

    await AuditLog.create([{
      action:     'SALE_COMPLETED',
      entity:     'Sale',
      entityId:   sale._id,
      afterData:  { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal },
      performedBy: employeeId,
      role:        'Employee',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Auto-link customer from buyer info on the existing payment record.
    try {
      const payment = await Payment.findOne({ saleId: sale._id, direction: 'CHARGE' });
      if (payment?.buyer?.name?.trim()) {
        const customerId = await upsertCustomerFromBuyer(payment.buyer);
        if (customerId) await Sale.findByIdAndUpdate(sale._id, { customerId });
      }
    } catch (e) {
      console.warn('[customer-link] completeSale skipped:', e.message);
    }

    return sale;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Full manager-grade detail for a single sale.
 * Returns sale, all payments (charges + refunds), linked overrides, audit trail.
 * Managers and Admins can view any sale. Employees are scoped to their own.
 */
const getSaleDetailManager = async (saleId, requestingUser) => {
  const isPrivileged = requestingUser.role === 'Manager' || requestingUser.role === 'Admin';

  const sale = await Sale.findById(saleId)
    .populate('employeeId', 'name employeeCode role')
    .populate('shiftId', 'startedAt closedAt status')
    .lean();
  if (!sale) throw new Error('Sale not found');

  if (!isPrivileged && String(sale.employeeId?._id || sale.employeeId) !== String(requestingUser._id)) {
    throw new Error('Not authorized to view this sale');
  }

  // All payments: original charges first, then refund reversals
  const payments = await Payment.find({ saleId: sale._id })
    .sort({ createdAt: 1 })
    .lean();

  // All manager overrides linked to this sale (refund, void, discount, price-change)
  const overrides = await ManagerOverride.find({
    $or: [
      { originalSaleId: sale._id },
      { saleId: sale._id },
      { completedSaleId: sale._id },
    ],
  })
    .populate('employeeId', 'name employeeCode')
    .populate('approvedBy', 'name employeeCode')
    .sort({ createdAt: 1 })
    .lean();

  // Audit trail entries for this sale entity
  const auditLogs = await AuditLog.find({ entity: 'Sale', entityId: sale._id })
    .populate('performedBy', 'name employeeCode')
    .sort({ timestamp: 1 })
    .lean();

  return { sale, payments, overrides, auditLogs };
};

/**
 * Server-side aggregate KPIs for the filtered dataset.
 * Accepts the same filters as listTransactions (minus search, page, limit).
 * Returns: totalCount, grossRevenue, refundedAmount, netRevenue, discountTotal, voidCount.
 */
const getTransactionKpis = async (requestingUser, {
  method     = '',
  status     = '',
  startDate  = '',
  endDate    = '',
  employeeId = '',
} = {}) => {
  const isPrivileged = requestingUser.role === 'Manager' || requestingUser.role === 'Admin';

  const saleFilter = {
    $or: [{ status: 'COMPLETED' }, { status: { $exists: false } }],
  };

  if (!isPrivileged) {
    saleFilter.employeeId = requestingUser._id;
  } else if (employeeId) {
    saleFilter.employeeId = new mongoose.Types.ObjectId(employeeId);
  }

  if (status) saleFilter.paymentStatus = status;

  if (startDate || endDate) {
    saleFilter.createdAt = {};
    if (startDate) saleFilter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      saleFilter.createdAt.$lte = end;
    }
  }

  // Method filter requires a Payment join; resolve sale IDs first
  if (method) {
    const methodPayments = await Payment.find({
      method,
      direction: { $ne: 'REFUND' },
    }).select('saleId').lean();
    const methodSaleIds = [...new Set(methodPayments.map((p) => p.saleId.toString()))];
    if (methodSaleIds.length === 0) {
      return { totalCount: 0, grossRevenue: 0, refundedAmount: 0, netRevenue: 0, discountTotal: 0, voidCount: 0 };
    }
    saleFilter._id = { $in: methodSaleIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const [result] = await Sale.aggregate([
    { $match: saleFilter },
    {
      $group: {
        _id: null,
        totalCount:     { $sum: 1 },
        grossRevenue:   { $sum: '$grandTotal' },
        refundedAmount: { $sum: '$refundedAmount' },
        discountTotal:  { $sum: '$discountTotal' },
        voidCount:      { $sum: { $cond: [{ $eq: ['$paymentStatus', 'VOIDED'] }, 1, 0] } },
      },
    },
  ]);

  const r = result || { totalCount: 0, grossRevenue: 0, refundedAmount: 0, discountTotal: 0, voidCount: 0 };
  return { ...r, netRevenue: (r.grossRevenue || 0) - (r.refundedAmount || 0) };
};

/**
 * List all active employees (Manager/Admin only).
 * Used to populate the employee filter dropdown on the manager transactions page.
 */
const listEmployees = async () => {
  return User.find({ isActive: true })
    .select('name employeeCode role')
    .sort({ name: 1 })
    .lean();
};

export { processSale, completeSale, searchSales, getSaleDetail, getSaleDetailManager, listTransactions, getTransactionKpis, listEmployees };
