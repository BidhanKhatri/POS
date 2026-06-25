import mongoose from 'mongoose';

const pinResetOtpSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otpHash:   { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

// One active OTP per user at a time
pinResetOtpSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('PinResetOtp', pinResetOtpSchema);
