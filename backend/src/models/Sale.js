import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  defaultPrice: {
    type: Number,  // catalog price at sale time; set for PRICE_CHANGE overrides, null for normal sales
  },
  quantity: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  // Rollup of how much of this line item has already been refunded —
  // incremented atomically on refund approval. The original total/quantity
  // above are never edited; this is how partial/duplicate refunds are capped.
  refundedQty: {
    type: Number,
    default: 0,
  },
  refundedAmount: {
    type: Number,
    default: 0,
  },
});

const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: false,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discountTotal: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  // Lifecycle gate: PENDING_APPROVAL / APPROVED sales are discount overrides
  // in progress — they are excluded from reports until COMPLETED.
  // Default is COMPLETED so all pre-existing sale documents remain valid.
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'VOIDED'],
    default: 'COMPLETED',
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'],
    default: 'PENDING',
  },
  // Sale-level rollup, kept in sync with the sum of item.refundedAmount.
  // The Sale document itself is otherwise immutable — only these counters move.
  refundedAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

saleSchema.index({ customerId: 1, createdAt: -1 });
saleSchema.index({ shiftId: 1 });
saleSchema.index({ employeeId: 1, createdAt: -1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentStatus: 1, createdAt: -1 });
saleSchema.index({ 'items.sku': 1 });
saleSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Sale', saleSchema);
