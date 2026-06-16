import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  method: {
    type: String,
    enum: ['CASH', 'CREDIT', 'DEBIT', 'MISC'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
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
  buyer: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  // Card payments store only a masked reference (brand + last 4) returned by the
  // terminal/processor. The full PAN, CVV, and expiry must NEVER be persisted —
  // storing raw cardholder data here would violate PCI-DSS.
  card: {
    brand: { type: String, enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] },
    last4: { type: String, match: /^\d{4}$/ },
  },
}, {
  timestamps: true,
});

paymentSchema.index({ saleId: 1 });
paymentSchema.index({ createdAt: 1 });

export default mongoose.model('Payment', paymentSchema);
