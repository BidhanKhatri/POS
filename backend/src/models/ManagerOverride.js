import mongoose from 'mongoose';

const managerOverrideSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['REFUND', 'VOID', 'DISCOUNT', 'PRICE_CHANGE'],
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'DENIED'],
    default: 'PENDING',
  },
  // Set once the request is approved and acted on (e.g. the Sale created for a refund).
  // Pending requests have no target yet, so this is intentionally optional.
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  reason: {
    type: String,
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  managerPinVerified: {
    type: Boolean,
    default: false,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resolvedAt: {
    type: Date,
  },

  // ── Discount-specific fields ──
  // Captured at request time so the approving manager can see exactly what
  // was requested and what limit was in force at that moment.
  discountType:   { type: String, enum: ['PERCENTAGE', 'FIXED'] },
  discountValue:  { type: Number },   // raw input: % or $ entered by employee
  discountAmount: { type: Number },   // computed dollar value to be deducted
  discountLimit:  { type: Number },   // maxDiscountPercent in force at request time

  // ── Refund-specific request details ──
  // Invoice-linked refund: the request must reference a real, original sale line
  // item. Never a freestanding amount — this is what makes the refund auditable
  // and lets the system cap it at the item's remaining-refundable amount.
  originalSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
  },
  originalSaleItemId: {
    type: mongoose.Schema.Types.ObjectId, // _id of the subdocument inside Sale.items
  },
  originalPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment', // which original tender this refund reverses
  },
  invoiceNo: { type: String },
  requestedQty: { type: Number },
  amount: {
    type: Number,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  productName: { type: String },
  sku: { type: String },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CREDIT', 'DEBIT', 'MISC'],
  },
  // True when the employee chose a refund tender different from the original
  // payment method — a fraud-review signal for the approving manager.
  methodOverridden: {
    type: Boolean,
    default: false,
  },
  // True when the requester confirmed the buyer they're refunding matches the
  // buyer recorded on the original sale.
  buyerVerified: {
    type: Boolean,
    default: false,
  },
  buyer: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  // Masked card reference only — never the full PAN/CVV/expiry.
  card: {
    brand: { type: String, enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] },
    last4: { type: String, match: /^\d{4}$/ },
  },

  // ── Sale context snapshot (DISCOUNT overrides only) ──
  // Captured at override-submission time so: (a) the manager sees full context
  // before approving, (b) the employee can resume directly to payment after
  // approval without re-entering details, and (c) OverridesPage can reconstruct
  // the TenderPage state for orphaned approved overrides.
  saleContext: {
    paymentMethod: { type: String, enum: ['CASH', 'CREDIT', 'DEBIT', 'MISC'] },
    card: {
      brand: { type: String, enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] },
      last4: { type: String, match: /^\d{4}$/ },
    },
    buyer: {
      name:  { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
  },

  // For DISCOUNT overrides: the Sale document created upfront as PENDING_APPROVAL
  // at override-submission time. The same document is finalized to COMPLETED when
  // the employee confirms payment — no second Sale is ever created.
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },

  // Set once the employee finalizes payment after a DISCOUNT override is approved.
  // Null = approved but sale not yet completed (employee needs to resume).
  completedSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  completedAt:     { type: Date },

  // Client-generated key so a double-tap/network retry on submit can't create
  // two requests for the same refund attempt.
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

managerOverrideSchema.index({ createdAt: 1 });
managerOverrideSchema.index({ status: 1 });
managerOverrideSchema.index({ originalSaleId: 1 });
// Only one PENDING refund request may exist per sale line item at a time —
// the core duplicate/over-refund guard, enforced at the database layer.
managerOverrideSchema.index(
  { originalSaleItemId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING', originalSaleItemId: { $type: 'objectId' } } }
);
// Only one PENDING void request may exist per sale at a time.
managerOverrideSchema.index(
  { originalSaleId: 1 },
  {
    unique: true,
    name: 'unique_pending_void_per_sale',
    partialFilterExpression: {
      status: 'PENDING',
      actionType: 'VOID',
      originalSaleId: { $type: 'objectId' },
    },
  }
);

export default mongoose.model('ManagerOverride', managerOverrideSchema);
