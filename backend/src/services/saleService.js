import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';

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

const processSale = async (employeeId, shiftId, items, payments, discountTotal = 0) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 0. Validate + build payment records up front (cheap, sync) so bad buyer/card
    // input fails fast before any stock or sale data is touched.
    const paymentRecords = payments.map((p) => buildPaymentRecord(null, p));

    // 1. Calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (let item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }
      if (product.stockQty < item.quantity) {
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

    // 5. Create Inventory Movements
    for (let item of items) {
      const movement = new InventoryMovement({
        ...item._inventoryData,
        referenceId: sale._id,
        referenceType: 'Sale',
        createdBy: employeeId,
      });
      await movement.save({ session });
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

    await session.commitTransaction();
    session.endSession();

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
  const saleFilter = {};

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

export { processSale, searchSales, getSaleDetail, listTransactions };
