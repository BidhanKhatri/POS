import mongoose from 'mongoose';

/**
 * Stores WebAuthn public-key credentials.
 * Biometric data NEVER leaves the device; we only store the public key
 * and metadata needed to verify future authentication assertions.
 */
const webAuthnCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // base64url-encoded credential ID assigned by the authenticator
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // CBOR-encoded public key (stored as Buffer, never transmitted)
    publicKey: {
      type: Buffer,
      required: true,
    },
    // Monotonically increasing counter — used to detect cloned credentials
    counter: {
      type: Number,
      required: true,
      default: 0,
    },
    // 'singleDevice' | 'multiDevice'
    deviceType: {
      type: String,
      enum: ['singleDevice', 'multiDevice'],
      required: true,
    },
    // Whether the credential is backed up to the cloud (e.g. iCloud Keychain)
    backedUp: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Authenticator transport hints used to filter UI
    transports: {
      type: [String],
      enum: ['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'],
      default: [],
    },
    // AAGUID identifies the authenticator model (e.g. Touch ID, Windows Hello)
    aaguid: {
      type: String,
      default: '00000000-0000-0000-0000-000000000000',
    },
    // Human-readable name set by the user during registration
    deviceName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'My Device',
    },
    // User-agent snapshot at registration time (for display only)
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
    },
    lastUsedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

webAuthnCredentialSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model('WebAuthnCredential', webAuthnCredentialSchema);
