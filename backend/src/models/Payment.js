import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  method: {
    type: String,
    enum: ['CASH', 'MOI', 'DEBIT', 'MISC'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  referenceNo: {
    type: String,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'SUCCESS',
  },
  // CHARGE = original tender on the sale. REFUND = a reversal of one of those
  // charges, linked back via reversedPaymentId so split-tender sales refund
  // the correct original payment instead of an ambiguous "the sale".
  direction: {
    type: String,
    enum: ['CHARGE', 'REFUND'],
    default: 'CHARGE',
  },
  reversedPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  // ── Refund tip (REFUND-direction payments only) ──
  // `amount` above always stays the original refund value (what the returned
  // item is worth) — untouched by tip, so it keeps driving Sale/item refund
  // accounting and revenue reports exactly as before. The tip is carved out
  // of the payout to the customer and tracked here purely for cash
  // reconciliation and reporting; it is never counted as revenue.
  tipAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // amount - tipAmount — what actually went back to the customer. Stored
  // explicitly (not just derived) so the audit trail is immutable even if
  // the calculation ever changes.
  finalRefundAmount: {
    type: Number,
    min: 0,
  },
  buyer: {
    name: { type: String, trim: true },
  },
  // Card payments store only a masked reference (type + brand + last 4) returned by
  // the terminal/processor. The full PAN, CVV, and expiry must NEVER be persisted —
  // storing raw cardholder data here would violate PCI-DSS.
  card: {
    cardType: { type: String, enum: ['CREDIT', 'DEBIT'] },
    brand: { type: String, enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] },
    last4: { type: String, match: /^\d{4}$/ },
  },
}, {
  timestamps: true,
});

paymentSchema.index({ saleId: 1 });
paymentSchema.index({ createdAt: 1 });

export default mongoose.model('Payment', paymentSchema);
