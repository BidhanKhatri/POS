import mongoose from 'mongoose';

const managerOverrideSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['REFUND', 'VOID', 'DISCOUNT', 'PRICE_CHANGE'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can refer to Sale, Product, etc.
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  managerPinVerified: {
    type: Boolean,
    required: true,
    default: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
}, {
  timestamps: true,
});

managerOverrideSchema.index({ createdAt: 1 });

export default mongoose.model('ManagerOverride', managerOverrideSchema);
