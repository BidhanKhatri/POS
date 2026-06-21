import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, trim: true },
  email:    { type: String, trim: true, lowercase: true },
  notes:    { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ phone: 1 }, { sparse: true });
customerSchema.index({ email: 1 }, { sparse: true });
customerSchema.index({ isActive: 1, createdAt: -1 });
customerSchema.index({ name: 'text', phone: 'text', email: 'text' });

export default mongoose.model('Customer', customerSchema);
