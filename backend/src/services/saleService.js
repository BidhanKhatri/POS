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

const processSale = async (employeeId, shiftId, items, payments, discountTotal = 0) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

      const total = (product.price * item.quantity) - (item.discount || 0);
      subtotal += total;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.price,
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
    for (let p of payments) {
      const payment = new Payment({
        saleId: sale._id,
        method: p.method,
        amount: p.amount,
        referenceNo: p.referenceNo,
        status: 'SUCCESS',
      });
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

    // 6. Update Shift totals
    const shift = await Shift.findById(shiftId).session(session);
    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Shift is not open or not found');
    }
    shift.totalSales += grandTotal;
    shift.totalTransactions += 1;
    await shift.save({ session });

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

export { processSale, };
