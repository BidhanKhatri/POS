import mongoose from 'mongoose';

const pendingVerificationSchema = new mongoose.Schema({
  token:         { type: String, required: true, unique: true, index: true },
  name:          { type: String, required: true },
  email:         { type: String, required: true, lowercase: true },
  pin:           { type: String, required: true }, // plaintext — doc is short-lived (15 min TTL) and deleted on first use
  emsEmployeeId: { type: String, default: null },
  expiresAt:     { type: Date, required: true, index: { expires: 0 } }, // TTL — doc auto-deleted at expiresAt
}, { timestamps: true });

// One pending verification per email — replace stale ones on re-signup
pendingVerificationSchema.index({ email: 1 });

export default mongoose.model('PendingVerification', pendingVerificationSchema);
