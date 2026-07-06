/**
 * databaseActionOtpService.js
 * Step-up verification OTP for Database Management actions (delete/restore).
 * Mirrors pinResetService.js's OTP pattern exactly, but is scoped to the
 * already-authenticated manager (req.user) rather than an email lookup —
 * this is a step-up check on an existing session, not an account-recovery flow.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PinResetOtp from '../models/PinResetOtp.js';
import { sendOtpEmail } from './emailService.js';

const OTP_TTL_MS = 2 * 60 * 1000;      // 2 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 seconds between sends

function generateOtp() {
  return String(crypto.randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

function invalidOtpError() {
  const err = new Error('Invalid or expired code. Request a new one and try again.');
  err.statusCode = 400;
  return err;
}

/**
 * Sends a 6-digit OTP to the acting manager's own email address.
 */
export async function requestDatabaseActionOtp(manager) {
  const existing = await PinResetOtp.findOne({ userId: manager._id });
  if (existing) {
    const elapsed = Date.now() - new Date(existing.createdAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${wait}s before requesting another code.`);
      err.statusCode = 429;
      throw err;
    }
    await existing.deleteOne();
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, await bcrypt.genSalt(10));

  await PinResetOtp.create({
    userId: manager._id,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail({
    to: manager.email,
    name: manager.name,
    otp,
    purpose: 'Database Action',
    description: 'A database management action (backup deletion or restore) requires your confirmation. Use the code below — it expires in <strong>2 minutes</strong> and can only be used once. If you did not request this, secure your account immediately.',
  });
}

/**
 * Verifies the OTP for the acting manager. Single-use — consumed on success
 * or failure alike is NOT the behavior here (only success consumes it, so a
 * mistyped digit doesn't burn the code — matching pinResetService's verifyOtp).
 */
export async function verifyDatabaseActionOtp(manager, otp) {
  const doc = await PinResetOtp.findOne({ userId: manager._id });
  if (!doc || doc.expiresAt < new Date()) {
    await doc?.deleteOne();
    throw invalidOtpError();
  }

  const valid = await bcrypt.compare(String(otp ?? ''), doc.otpHash);
  if (!valid) throw invalidOtpError();

  await doc.deleteOne();
}
