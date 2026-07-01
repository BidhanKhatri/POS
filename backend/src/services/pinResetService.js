import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PinResetOtp from '../models/PinResetOtp.js';
import AuditLog from '../models/AuditLog.js';
import { sendOtpEmail } from './emailService.js';

const OTP_TTL_MS = 2 * 60 * 1000;       // 2 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;    // 60 seconds between sends
const RESET_TOKEN_TTL_S = 5 * 60;        // 5 minutes to complete PIN change

// Cryptographically secure 6-digit numeric OTP
function generateOtp() {
  return String(crypto.randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

// Shared error to prevent timing-based user enumeration on verify/reset
function invalidOtpError() {
  const err = new Error('Invalid or expired code.');
  err.statusCode = 400;
  return err;
}

/**
 * POST /api/auth/forgot-pin/request
 * Sends a 6-digit OTP to the user's email.
 * Returns silently if email is not found — prevents user enumeration.
 */
export async function requestOtp(email, ip) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Silent return for unknown / inactive accounts — same response as success
  if (!user || !user.isActive || user.status !== 'ACTIVE') return;

  const existing = await PinResetOtp.findOne({ userId: user._id });
  if (existing) {
    const elapsed = Date.now() - new Date(existing.createdAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${wait}s before requesting another code.`);
      err.statusCode = 429;
      throw err;
    }
    // Cooldown passed — remove stale OTP before issuing a new one
    await existing.deleteOne();
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, await bcrypt.genSalt(10));

  await PinResetOtp.create({
    userId: user._id,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail({ to: user.email, name: user.name, otp });
}

/**
 * POST /api/auth/forgot-pin/verify
 * Verifies the OTP and returns a short-lived signed resetToken.
 * The OTP is consumed immediately (single-use).
 */
export async function verifyOtp(email, otp) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw invalidOtpError();

  const doc = await PinResetOtp.findOne({ userId: user._id });
  if (!doc || doc.expiresAt < new Date()) {
    await doc?.deleteOne();
    throw invalidOtpError();
  }

  const valid = await bcrypt.compare(String(otp), doc.otpHash);
  if (!valid) throw invalidOtpError();

  // Consume immediately — one-shot, invalidated after use
  await doc.deleteOne();

  const resetToken = jwt.sign(
    { sub: String(user._id), purpose: 'pin-reset' },
    process.env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_TTL_S },
  );

  return resetToken;
}

/**
 * POST /api/auth/forgot-pin/reset
 * Validates the resetToken and updates the user's PIN.
 * Writes an audit log entry on success.
 */
export async function resetPin(email, resetToken, newPin, ip) {
  if (!/^\d{4}$/.test(String(newPin))) {
    const err = new Error('PIN must be exactly 4 digits.');
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    const err = new Error('Reset session has expired. Please start over.');
    err.statusCode = 400;
    throw err;
  }

  if (payload.purpose !== 'pin-reset') {
    const err = new Error('Invalid reset token.');
    err.statusCode = 400;
    throw err;
  }

  // Bind token to the exact email to prevent token transplanting
  const user = await User.findOne({
    _id: payload.sub,
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    const err = new Error('Invalid reset session.');
    err.statusCode = 400;
    throw err;
  }

  // Hash manually and use findByIdAndUpdate to bypass the pre-save hook
  const hashedPin = await bcrypt.hash(String(newPin), await bcrypt.genSalt(10));
  await User.findByIdAndUpdate(user._id, { $set: { pinHash: hashedPin } });

  await AuditLog.create({
    action: 'PIN_RESET_VIA_OTP',
    entity: 'User',
    entityId: user._id,
    beforeData: null,
    afterData: { email: user.email, method: 'otp' },
    performedBy: user._id,
    role: user.role,
    ipAddress: ip || 'unknown',
  });
}
