import mongoose from 'mongoose';

const trustedSessionSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash:  { type: String, required: true, select: false },
  deviceId:   { type: String, required: true },
  deviceName: { type: String, default: 'POS Terminal' },
  ipAddress:  { type: String, default: '' },
  isRevoked:  { type: Boolean, default: false },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt:  { type: Date, required: true },
}, { timestamps: true });

// One session per (user, device) — upserted on every login
trustedSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Fast lookup during refresh (hash is the primary search key)
trustedSessionSchema.index({ deviceId: 1, tokenHash: 1 });

// MongoDB TTL — auto-delete expired sessions
trustedSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TrustedSession', trustedSessionSchema);
