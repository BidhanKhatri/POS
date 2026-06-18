import mongoose from 'mongoose';

/**
 * Ephemeral challenge store for WebAuthn ceremonies.
 * Documents expire automatically via MongoDB TTL index (5 minutes).
 * A sessionToken ties the begin ↔ verify round-trip without relying on
 * server-side sessions.
 */
const webAuthnChallengeSchema = new mongoose.Schema({
  // Opaque token returned to the client; sent back on verify
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // base64url challenge embedded in the authenticator options
  challenge: {
    type: String,
    required: true,
  },
  // 'registration' | 'authentication'
  type: {
    type: String,
    enum: ['registration', 'authentication'],
    required: true,
  },
  // Set for registration (user already authenticated via PIN/JWT)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  // Set for authentication when the client provides an email hint
  emailHint: {
    type: String,
    lowercase: true,
    trim: true,
  },
  // MongoDB TTL: document removed 5 minutes after creation
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
  },
});

webAuthnChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('WebAuthnChallenge', webAuthnChallengeSchema);
