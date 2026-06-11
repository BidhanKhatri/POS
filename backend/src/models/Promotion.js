import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'BOGO'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    // Flexible structure for conditions e.g. { minAmount: 1000 } or { productId: 'xxx' }
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

promotionSchema.index({ startDate: 1, endDate: 1 });
promotionSchema.index({ isActive: 1 });

export default mongoose.model('Promotion', promotionSchema);
