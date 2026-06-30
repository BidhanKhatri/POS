import crypto from 'crypto';
import User from '../models/User.js';
import PendingVerification from '../models/PendingVerification.js';
import Setting from '../models/Setting.js';
import { verifyEmployeeInEMS } from './staffingService.js';
import { sendVerificationEmail } from './emailService.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};


const serializeUser = (user, includeToken = false) => {
  const payload = {
    _id: user._id,
    clerkId: user.clerkId,
    employeeCode: user.employeeCode,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    status: user.status ?? 'ACTIVE',
    imageUrl: user.imageUrl ?? null,
  };

  if (includeToken) {
    payload.token = generateToken(user._id);
  }

  return payload;
};


const loginUser = async (email, pin) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+pinHash');

  if (!user) {
    // When sync is on, unrecognised emails are almost certainly non-EMS addresses
    const setting = await Setting.findById('global').lean();
    if (setting?.syncStaffingBetit) {
      const err = new Error('Use your Staffing Betit (EMS) email to access this portal.');
      err.accountStatus = 'EMS_REQUIRED';
      err.statusCode = 403;
      throw err;
    }
    throw new Error('Invalid email or PIN');
  }

  // Status check — gives specific, actionable messages per state
  const accountStatus = user.status ?? 'ACTIVE';
  if (accountStatus === 'PENDING') {
    const err = new Error('Your account is awaiting manager approval. You will be notified once approved.');
    err.accountStatus = 'PENDING';
    err.statusCode = 403;
    throw err;
  }
  if (accountStatus === 'REJECTED') {
    const err = new Error('Your account application was not approved. Please contact your manager.');
    err.accountStatus = 'REJECTED';
    err.statusCode = 403;
    throw err;
  }
  if (accountStatus === 'SUSPENDED') {
    const err = new Error('Your account has been suspended. Please contact your manager.');
    err.accountStatus = 'SUSPENDED';
    err.statusCode = 403;
    throw err;
  }

  if (!user.isActive) {
    throw new Error('Employee account is inactive');
  }

  const isMatch = await user.matchPin(pin);

  if (!isMatch) {
    throw new Error('Invalid email or PIN');
  }

  return serializeUser(user, true);
};

const generateEmployeeCode = async (name, email) => {
  const source = email ? email.split('@')[0] : name;
  const base = String(source).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'EMP';
  let employeeCode = base;
  let counter = 1;
  while (await User.exists({ employeeCode })) {
    const suffix = String(counter).padStart(2, '0');
    employeeCode = `${base.slice(0, 10)}${suffix}`;
    counter += 1;
  }
  return employeeCode;
};

const registerUser = async ({ name, email, pin, role = 'Employee' }) => {
  if (!name || !pin) {
    throw new Error('name and pin are required');
  }

  if (!email) {
    throw new Error('email is required');
  }

  const normalizedEmail = email.toLowerCase();

  // Check if manager has enabled Staffing Betit sync
  const setting = await Setting.findById('global').lean();
  const syncEnabled = setting?.syncStaffingBetit ?? false;

  if (syncEnabled) {
    // ── Sync ON path ──────────────────────────────────────────────────────
    // 1. Verify against EMS
    let emsResult;
    try {
      emsResult = await verifyEmployeeInEMS(normalizedEmail);
    } catch {
      const err = new Error('Unable to reach Staffing Betit to verify your email. Please try again later.');
      err.statusCode = 503;
      throw err;
    }
    if (!emsResult.exists) {
      const err = new Error('Your email was not found in Staffing Betit. Please use your work email or contact your manager.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Reject if an ACTIVE POS account already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing?.status === 'ACTIVE') {
      const err = new Error('An active account already exists for this email. Please log in directly.');
      err.statusCode = 409;
      throw err;
    }

    // 3. Store PendingVerification (plain PIN — TTL 15 min, deleted on first use), send email
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Replace any previous pending doc for this email atomically
    await PendingVerification.findOneAndDelete({ email: normalizedEmail });
    await PendingVerification.create({
      token,
      name,
      email: normalizedEmail,
      pin,  // plain — User pre-save hook will hash it on User.create
      emsEmployeeId: emsResult.employeeId ?? null,
      expiresAt,
    });

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;
    await sendVerificationEmail({ to: normalizedEmail, name, verifyUrl });

    return { pendingVerification: true };
  }

  // ── Sync OFF path ─────────────────────────────────────────────────────────
  // Standard local signup — email must be unique, account starts PENDING.
  const emailExists = await User.findOne({ email: normalizedEmail });
  if (emailExists) throw new Error('Email already in use');

  const employeeCode = await generateEmployeeCode(name, normalizedEmail);
  const user = await User.create({
    employeeCode,
    name,
    email: normalizedEmail,
    role,
    authProvider: 'local',
    pinHash: pin,
    status: 'PENDING',
    isActive: false,
  });
  return serializeUser(user, false);
};


const verifyEmail = async (token) => {
  if (!token) {
    const err = new Error('Verification token is missing.');
    err.statusCode = 400;
    throw err;
  }

  const pending = await PendingVerification.findOne({ token });
  if (!pending) {
    const err = new Error('This verification link is invalid or has expired. Please sign up again.');
    err.statusCode = 410;
    throw err;
  }
  if (pending.expiresAt < new Date()) {
    await pending.deleteOne();
    const err = new Error('This verification link has expired. Please sign up again.');
    err.statusCode = 410;
    throw err;
  }

  const { name, email, pin, emsEmployeeId } = pending;

  // Check if a POS record already exists (could be PENDING/REJECTED/SUSPENDED from a previous attempt)
  const existing = await User.findOne({ email });
  let user;

  if (existing) {
    if (existing.status === 'ACTIVE') {
      await pending.deleteOne();
      const err = new Error('This account is already active. Please log in.');
      err.statusCode = 409;
      throw err;
    }
    // Reactivate stale record — hash the PIN manually since findByIdAndUpdate bypasses pre-save hooks
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPin = await bcrypt.hash(pin, await bcrypt.genSalt(10));
    user = await User.findByIdAndUpdate(
      existing._id,
      { $set: { name, status: 'ACTIVE', isActive: true, pinHash: hashedPin, ...(emsEmployeeId && { staffingBetitEmployeeId: emsEmployeeId }) } },
      { new: true }
    );
  } else {
    const employeeCode = await generateEmployeeCode(name, email);
    // Pass plain pin as pinHash — the User pre-save hook hashes it exactly once
    user = await User.create({
      employeeCode,
      name,
      email,
      role: 'Employee',
      authProvider: 'local',
      pinHash: pin,
      status: 'ACTIVE',
      isActive: true,
      ...(emsEmployeeId && { staffingBetitEmployeeId: emsEmployeeId }),
    });
  }

  await pending.deleteOne();
  return serializeUser(user, true);
};

export { loginUser, registerUser, verifyEmail };
