import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'QR', 'BANK_TRANSFER', 'MOBILE_WALLET'],
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
}, {
  timestamps: true,
});

paymentSchema.index({ saleId: 1 });
paymentSchema.index({ createdAt: 1 });

export default mongoose.model('Payment', paymentSchema);
