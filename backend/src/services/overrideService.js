import mongoose from 'mongoose';
import Setting from '../models/Setting.js';
import ManagerOverride from '../models/ManagerOverride.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import InventoryMovement from '../models/InventoryMovement.js';
import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const PAYMENT_METHODS = ['CASH', 'MOI', 'DEBIT', 'MISC'];

// Employee-initiated, invoice-linked refund request — created PENDING, requires
// manager PIN to act on. Every refund must reference a real sale + line item;
// there is no "freestanding amount" path.
const createRefundRequest = async (employeeId, {
  saleId, saleItemId, quantity, paymentMethod, buyer, card, reason, buyerVerified, idempotencyKey,
}) => {
  if (!saleId || !saleItemId) throw new Error('A sale and sale item must be selected for a refund');
  const qty = Number(quantity);
  if (!qty || qty <= 0) throw new Error('A valid refund quantity is required');
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new Error('A valid refund method is required');
  if (!buyer || !buyer.name || !buyer.name.trim()) throw new Error('Buyer name is required for a refund request');

  const sale = await Sale.findById(saleId);
  if (!sale) throw new Error('Original sale not found');
  if (!['PAID', 'PARTIAL'].includes(sale.paymentStatus)) {
    throw new Error('This sale is not in a refundable state');
  }

  const item = sale.items.find((i) => String(i._id) === String(saleItemId));
  if (!item) throw new Error('Sale item not found on this invoice');

  const remainingQty = item.quantity - item.refundedQty;
  if (qty > remainingQty) {
    throw new Error(`Only ${remainingQty} unit(s) of this item remain refundable`);
  }

  const product = await Product.findById(item.productId);

  // Proportional amount so partial refunds split discounts/totals fairly.
  const amount = Math.round(((item.total / item.quantity) * qty) * 100) / 100;

  const originalPayment = await Payment.findOne({ saleId: sale._id, direction: { $ne: 'REFUND' } });
  const methodOverridden = !!originalPayment && originalPayment.method !== paymentMethod;

  const existingPending = await ManagerOverride.findOne({ originalSaleItemId: item._id, status: 'PENDING' });
  if (existingPending) {
    throw new Error('A refund request for this item is already pending manager approval');
  }

  try {
    return await ManagerOverride.create({
      actionType: 'REFUND',
      status: 'PENDING',
      reason: reason || 'Refund requested at POS terminal',
      employeeId,
      originalSaleId: sale._id,
      originalSaleItemId: item._id,
      originalPaymentId: originalPayment ? originalPayment._id : undefined,
      invoiceNo: sale.invoiceNo,
      requestedQty: qty,
      amount,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      paymentMethod,
      methodOverridden,
      buyerVerified: !!buyerVerified,
      buyer: {
        name: buyer.name.trim(),
        phone: buyer.phone || undefined,
        email: buyer.email || undefined,
      },
      card: card && card.last4 ? { brand: card.brand || 'OTHER', last4: card.last4 } : undefined,
      idempotencyKey: idempotencyKey || undefined,
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.message.includes('idempotencyKey')) {
        throw new Error('This refund request was already submitted');
      }
      throw new Error('A refund request for this item is already pending manager approval');
    }
    throw error;
  }
};

const getOverrides = async (status) => {
  // Validate against the allowlist before using it in a Mongo filter — an
  // unchecked query param here would otherwise be a NoSQL-injection vector.
  const filter = ['PENDING', 'APPROVED', 'DENIED'].includes(status) ? { status } : {};
  return await ManagerOverride.find(filter)
    .populate('employeeId', 'name employeeCode')
    .populate('approvedBy', 'name employeeCode')
    .sort({ createdAt: -1 });
};

const getMyOverrides = async (employeeId) => {
  return await ManagerOverride.find({ employeeId })
    .populate('approvedBy', 'name employeeCode')
    .sort({ createdAt: -1 });
};

const approveOverride = async (overrideId, managerId, pin) => {
  const manager = await User.findById(managerId).select('+pinHash');
  if (!manager || !(await manager.matchPin(pin))) {
    throw new Error('Invalid manager PIN');
  }

  // Separation of duties — the approving manager cannot be the person who
  // requested the refund.
  const pending = await ManagerOverride.findById(overrideId);
  if (!pending) throw new Error('Override request not found');
  if (String(pending.employeeId) === String(managerId)) {
    throw new Error('You cannot approve your own refund request');
  }

  if (pending.actionType === 'DISCOUNT') {
    // Atomically flip both the override and its linked Sale to APPROVED.
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const override = await ManagerOverride.findOneAndUpdate(
        { _id: overrideId, status: 'PENDING' },
        { $set: { status: 'APPROVED', approvedBy: managerId, managerPinVerified: true, resolvedAt: new Date() } },
        { new: true, session }
      );
      if (!override) throw new Error('Override request already resolved');

      if (override.saleId) {
        const updated = await Sale.findOneAndUpdate(
          { _id: override.saleId, status: 'PENDING_APPROVAL' },
          { $set: { status: 'APPROVED' } },
          { session }
        );
        if (!updated) throw new Error('Linked sale not found or already resolved');
      }

      await AuditLog.create([{
        action: 'DISCOUNT_APPROVED',
        entity: 'ManagerOverride',
        entityId: override._id,
        afterData: { productName: override.productName, discountAmount: override.discountAmount },
        performedBy: managerId,
        role: 'Manager',
      }], { session });

      await session.commitTransaction();
      session.endSession();
      return override;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  if (pending.actionType === 'VOID') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const override = await ManagerOverride.findOneAndUpdate(
        { _id: overrideId, status: 'PENDING' },
        { $set: { status: 'APPROVED', approvedBy: managerId, managerPinVerified: true, resolvedAt: new Date() } },
        { new: true, session }
      );
      if (!override) throw new Error('Override request already resolved');

      const sale = await Sale.findById(override.originalSaleId).session(session);
      if (!sale) throw new Error('Original sale not found');
      if (sale.status === 'VOIDED') throw new Error('Sale has already been voided');
      const isVoidable = (sale.status === 'COMPLETED' || !sale.status) && sale.paymentStatus === 'PAID';
      if (!isVoidable) throw new Error('Sale is no longer in a voidable state');

      // Restore stock for every line item in the voided sale (skipped when tracking disabled)
      const _voidSetting = await Setting.findById('global');
      if (_voidSetting?.stockTrackingEnabled ?? true) {
        for (const item of sale.items) {
          const product = await Product.findById(item.productId).session(session);
          if (product) {
            const beforeQty = product.stockQty;
            product.stockQty += item.quantity;
            await product.save({ session });

            await InventoryMovement.create([{
              productId:     product._id,
              movementType:  'VOID',
              quantity:      item.quantity,
              beforeQty,
              afterQty:      product.stockQty,
              referenceId:   sale._id,
              referenceType: 'Void',
              remarks:       `Void approved — invoice ${sale.invoiceNo} (override ${override._id})`,
              createdBy:     managerId,
            }], { session });
          }
        }
      }

      // Flip the sale to VOIDED
      sale.status        = 'VOIDED';
      sale.paymentStatus = 'VOIDED';
      await sale.save({ session });

      // Reverse shift totals so dashboard/reports stay accurate
      if (sale.shiftId) {
        const shift = await Shift.findById(sale.shiftId).session(session);
        if (shift && shift.status === 'OPEN') {
          shift.totalSales        = Math.max(0, shift.totalSales - sale.grandTotal);
          shift.totalTransactions = Math.max(0, shift.totalTransactions - 1);
          await shift.save({ session });
        }
      }

      await AuditLog.create([{
        action:     'VOID_APPROVED',
        entity:     'ManagerOverride',
        entityId:   override._id,
        beforeData: { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal, status: 'COMPLETED' },
        afterData:  { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal, status: 'VOIDED' },
        performedBy: managerId,
        role:        'Manager',
      }], { session });

      await session.commitTransaction();
      session.endSession();
      return override;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  if (pending.actionType === 'PRICE_CHANGE') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const override = await ManagerOverride.findOneAndUpdate(
        { _id: overrideId, status: 'PENDING' },
        { $set: { status: 'APPROVED', approvedBy: managerId, managerPinVerified: true, resolvedAt: new Date() } },
        { new: true, session }
      );
      if (!override) throw new Error('Override request already resolved');

      if (override.saleId) {
        const updated = await Sale.findOneAndUpdate(
          { _id: override.saleId, status: 'PENDING_APPROVAL' },
          { $set: { status: 'APPROVED' } },
          { session }
        );
        if (!updated) throw new Error('Linked sale not found or already resolved');
      }

      await AuditLog.create([{
        action: 'PRICE_CHANGE_APPROVED',
        entity: 'ManagerOverride',
        entityId: override._id,
        afterData: {
          productName:     override.productName,
          defaultPrice:    override.defaultPrice,
          sellingPrice:    override.sellingPrice,
          variancePercent: override.variancePercent,
        },
        performedBy: managerId,
        role: 'Manager',
      }], { session });

      await session.commitTransaction();
      session.endSession();
      return override;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  if (pending.actionType !== 'REFUND') {
    const result = await ManagerOverride.findOneAndUpdate(
      { _id: overrideId, status: 'PENDING' },
      { $set: { status: 'APPROVED', approvedBy: managerId, managerPinVerified: true, resolvedAt: new Date() } },
      { new: true }
    );
    if (!result) throw new Error('Override request already resolved');
    return result;
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Atomic compare-and-swap — eliminates the double-approve race. If another
    // request already resolved this override, matchedCount is 0 and we abort.
    const override = await ManagerOverride.findOneAndUpdate(
      { _id: overrideId, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          approvedBy: managerId,
          managerPinVerified: true,
          resolvedAt: new Date(),
        },
      },
      { new: true, session }
    );
    if (!override) throw new Error('Override request already resolved');

    const sale = await Sale.findById(override.originalSaleId).session(session);
    if (!sale) throw new Error('Original sale no longer exists');
    if (!['PAID', 'PARTIAL'].includes(sale.paymentStatus)) {
      throw new Error('Original sale is no longer in a refundable state');
    }

    const item = sale.items.find((i) => String(i._id) === String(override.originalSaleItemId));
    if (!item) throw new Error('Original sale item no longer exists');

    // Re-validate at execution time — closes the race window between request
    // submission and manager approval (e.g. another refund completed meanwhile).
    const remainingQty = item.quantity - item.refundedQty;
    if (override.requestedQty > remainingQty) {
      throw new Error('Refund no longer valid — remaining refundable quantity changed');
    }

    item.refundedQty += override.requestedQty;
    item.refundedAmount += override.amount;
    sale.refundedAmount += override.amount;
    sale.paymentStatus = sale.refundedAmount >= sale.grandTotal ? 'REFUNDED' : 'PARTIAL';
    await sale.save({ session });

    const product = await Product.findById(item.productId).session(session);
    let beforeQty = null;
    let afterQty = null;
    const _refundSetting = await Setting.findById('global');
    const _refundTracking = _refundSetting?.stockTrackingEnabled ?? true;
    if (product && _refundTracking) {
      beforeQty = product.stockQty;
      product.stockQty += override.requestedQty;
      afterQty = product.stockQty;
      await product.save({ session });
    }

    const refundPayment = new Payment({
      saleId: sale._id,
      method: override.paymentMethod,
      amount: override.amount,
      status: 'REFUNDED',
      direction: 'REFUND',
      reversedPaymentId: override.originalPaymentId,
      buyer: override.buyer,
      card: override.card,
    });
    await refundPayment.save({ session });

    if (product && _refundTracking) {
      await InventoryMovement.create([{
        productId: product._id,
        movementType: 'REFUND',
        quantity: override.requestedQty,
        beforeQty,
        afterQty,
        referenceId: sale._id,
        referenceType: 'Refund',
        remarks: `Refund approved for override ${override._id} (invoice ${sale.invoiceNo})`,
        createdBy: managerId,
      }], { session });
    }

    await AuditLog.create([{
      action: 'REFUND_APPROVED',
      entity: 'ManagerOverride',
      entityId: override._id,
      afterData: { invoiceNo: sale.invoiceNo, amount: override.amount, qty: override.requestedQty },
      performedBy: managerId,
      role: 'Manager',
    }], { session });

    await session.commitTransaction();
    session.endSession();
    return override;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const denyOverride = async (overrideId, managerId, pin) => {
  const manager = await User.findById(managerId).select('+pinHash');
  if (!manager || !(await manager.matchPin(pin))) {
    throw new Error('Invalid manager PIN');
  }

  const override = await ManagerOverride.findOneAndUpdate(
    { _id: overrideId, status: 'PENDING' },
    { $set: { status: 'DENIED', approvedBy: managerId, resolvedAt: new Date() } },
    { new: true }
  );
  if (!override) throw new Error('Override request already resolved');

  // Void the upfront-created Sale so it never appears in reports.
  if ((override.actionType === 'DISCOUNT' || override.actionType === 'PRICE_CHANGE') && override.saleId) {
    await Sale.findByIdAndUpdate(override.saleId, {
      $set: { status: 'VOIDED', paymentStatus: 'VOIDED' },
    });
  }

  await AuditLog.create({
    action: `${override.actionType}_DENIED`,
    entity: 'ManagerOverride',
    entityId: override._id,
    afterData: { reason: override.reason },
    performedBy: managerId,
    role: 'Manager',
  });

  return override;
};

const generateInvoiceNo = () =>
  'INV-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

// Pre-sale discount that exceeds the employee's configured limit.
// Creates a Sale as PENDING_APPROVAL (no stock touch, no payment) so the full
// sale context is persisted before the manager ever sees the request.
// The same Sale document is finalized to COMPLETED when the employee pays.
// Accepts optional `items` array for multi-item sales; falls back to single-item when absent.
const createDiscountOverride = async (employeeId, {
  productId, productName, sku, amount,
  discountType, discountValue, discountAmount, reason, saleContext,
  items, // optional [{productId, productName, sku, unitPrice, qty}]
}) => {
  if (!['PERCENTAGE', 'FIXED'].includes(discountType)) throw new Error('Invalid discount type');
  if (!discountValue || discountValue <= 0) throw new Error('Discount value must be greater than 0');
  if (!discountAmount || discountAmount <= 0) throw new Error('Computed discount amount is invalid');
  if (discountAmount >= amount) throw new Error('Discount cannot equal or exceed the sale amount');
  if (!reason || !reason.trim()) throw new Error('A reason is required for a discount override');

  const setting = await Setting.findById('global');
  const discountLimit = setting?.maxDiscountPercent ?? 10;

  let saleItems, subtotal, grandTotal;

  if (items && items.length > 1) {
    // Multi-item: discount is applied at transaction level, not per item
    saleItems = items.map((i) => ({
      productId:   i.productId,
      productName: i.productName,
      sku:         i.sku || '',
      unitPrice:   i.unitPrice,
      quantity:    i.qty || 1,
      discount:    0,
      total:       i.unitPrice * (i.qty || 1),
    }));
    subtotal   = saleItems.reduce((s, i) => s + i.total, 0);
    grandTotal = subtotal - discountAmount;
  } else {
    // Single item — preserve existing double-discount pattern so /complete totals match
    const itemTotal = amount - discountAmount;
    subtotal    = itemTotal;
    grandTotal  = subtotal - discountAmount;
    saleItems   = [{
      productId,
      productName,
      sku:       sku || '',
      unitPrice: amount,
      quantity:  1,
      discount:  discountAmount,
      total:     itemTotal,
    }];
  }

  const sale = await Sale.create({
    invoiceNo:     generateInvoiceNo(),
    employeeId,
    shiftId:       null,
    status:        'PENDING_APPROVAL',
    paymentStatus: 'PENDING',
    items:         saleItems,
    subtotal,
    discountTotal: discountAmount,
    taxTotal:      0,
    grandTotal,
  });

  const override = await ManagerOverride.create({
    actionType: 'DISCOUNT',
    status: 'PENDING',
    reason: reason.trim(),
    employeeId,
    saleId: sale._id,
    productId:   productId || (items?.[0]?.productId),
    productName: productName || (items?.[0]?.productName),
    sku:         sku || (items?.[0]?.sku),
    amount: amount - discountAmount,
    discountType,
    discountValue,
    discountAmount,
    discountLimit,
    saleContext: saleContext || undefined,
  });

  return override;
};

// Employee-initiated void request for a completed sale. Creates a PENDING
// ManagerOverride so the manager can approve/deny. The sale itself is not
// touched until approval — keeps it COMPLETED and visible in transaction history.
const createVoidRequest = async (employeeId, { saleId, reason }) => {
  if (!saleId) throw new Error('A sale must be selected to void');
  if (!reason || !reason.trim()) throw new Error('A reason is required for a void request');

  const sale = await Sale.findById(saleId);
  if (!sale) throw new Error('Sale not found');

  const isVoidable = (sale.status === 'COMPLETED' || !sale.status) && sale.paymentStatus === 'PAID';
  if (!isVoidable) {
    throw new Error('Only completed, paid sales can be voided');
  }

  try {
    return await ManagerOverride.create({
      actionType:    'VOID',
      status:        'PENDING',
      reason:        reason.trim(),
      employeeId,
      originalSaleId: sale._id,
      invoiceNo:     sale.invoiceNo,
      amount:        sale.grandTotal,
      productName:   sale.invoiceNo,  // surfaces as the card title in override history
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('A void request for this sale is already pending manager approval');
    }
    throw error;
  }
};

// Pre-sale price change that exceeds the employee's configured variance limit.
// Creates a Sale as PENDING_APPROVAL (no stock touch, no payment) and a PRICE_CHANGE
// ManagerOverride so the manager can approve/deny. On approval, the employee
// completes the sale via /complete — same flow as discount overrides.
// Accepts optional `items` (all cart items) and `varianceItems` (offending subset) for multi-item.
const createPriceChangeOverride = async (employeeId, {
  productId, productName, sku, defaultPrice, sellingPrice, variancePercent, reason, saleContext,
  items,        // optional: all cart items [{productId, productName, sku, sellingPrice, defaultPrice, qty, variancePercent?}]
  varianceItems,// optional: subset that exceed the limit
}) => {
  if (!reason || !reason.trim()) throw new Error('A reason is required for a price override');

  const setting = await Setting.findById('global');
  const varianceLimit = setting?.maxPriceVariancePercent ?? 10;

  let saleItems, subtotal, grandTotal;
  let primaryProductId, primaryProductName, primarySku, primaryDefaultPrice, primarySellingPrice, primaryVariancePct;

  if (items && items.length > 0) {
    // Multi-item: create sale with all cart items
    saleItems = items.map((i) => ({
      productId:    i.product?.productId || i.productId,
      productName:  i.product?.name || i.productName,
      sku:          i.product?.sku || i.sku || '',
      unitPrice:    i.sellingPrice,
      defaultPrice: i.product?.price || i.defaultPrice || null,
      quantity:     i.qty || 1,
      discount:     0,
      total:        i.sellingPrice * (i.qty || 1),
    }));
    subtotal   = saleItems.reduce((s, i) => s + i.total, 0);
    grandTotal = subtotal;

    // Primary = highest-variance item (for the single-field override display)
    const primary = (varianceItems && varianceItems.length > 0 ? varianceItems : items)
      .reduce((max, cur) => (cur.variancePercent || 0) >= (max.variancePercent || 0) ? cur : max, items[0]);
    primaryProductId    = primary.product?.productId || primary.productId;
    primaryProductName  = primary.product?.name || primary.productName;
    primarySku          = primary.product?.sku || primary.sku;
    primaryDefaultPrice = primary.product?.price || primary.defaultPrice;
    primarySellingPrice = primary.sellingPrice;
    primaryVariancePct  = primary.variancePercent || 0;
  } else {
    // Single item (backward-compat)
    if (!productId) throw new Error('Product is required for a price override');
    if (defaultPrice == null || defaultPrice < 0) throw new Error('Default price is invalid');
    if (sellingPrice == null || sellingPrice < 0) throw new Error('Selling price is invalid');
    saleItems = [{
      productId, productName, sku: sku || '',
      unitPrice: sellingPrice, defaultPrice,
      quantity: 1, discount: 0, total: sellingPrice,
    }];
    subtotal            = sellingPrice;
    grandTotal          = sellingPrice;
    primaryProductId    = productId;
    primaryProductName  = productName;
    primarySku          = sku;
    primaryDefaultPrice = defaultPrice;
    primarySellingPrice = sellingPrice;
    primaryVariancePct  = variancePercent;
  }

  const sale = await Sale.create({
    invoiceNo:     generateInvoiceNo(),
    employeeId,
    shiftId:       null,
    status:        'PENDING_APPROVAL',
    paymentStatus: 'PENDING',
    items:         saleItems,
    subtotal,
    discountTotal: 0,
    taxTotal:      0,
    grandTotal,
  });

  const override = await ManagerOverride.create({
    actionType:      'PRICE_CHANGE',
    status:          'PENDING',
    reason:          reason.trim(),
    employeeId,
    saleId:          sale._id,
    productId:       primaryProductId,
    productName:     primaryProductName,
    sku:             primarySku,
    amount:          primarySellingPrice,
    defaultPrice:    primaryDefaultPrice,
    sellingPrice:    primarySellingPrice,
    variancePercent: Math.abs(primaryVariancePct),
    varianceLimit,
    saleContext:     saleContext || undefined,
  });

  return override;
};

// Polled by the employee's DiscountPage while waiting for manager approval.
// Scoped to the requesting employee so employees can't peek at others' requests.
const getOverrideById = async (overrideId, employeeId) => {
  const override = await ManagerOverride.findOne({ _id: overrideId, employeeId })
    .populate('approvedBy', 'name');
  if (!override) throw new Error('Override request not found');
  return override;
};

export { createRefundRequest, createDiscountOverride, createVoidRequest, createPriceChangeOverride, getOverrideById, getOverrides, getMyOverrides, approveOverride, denyOverride };
