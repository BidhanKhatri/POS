import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import User from '../models/User.js';
import WebAuthnCredential from '../models/WebAuthnCredential.js';
import WebAuthnChallenge from '../models/WebAuthnChallenge.js';
import AuditLog from '../models/AuditLog.js';

// ── Relying Party config (set in .env) ───────────────────────────────────────
const RP_NAME   = process.env.WEBAUTHN_RP_NAME   || 'POS Manager Portal';
const RP_ID     = process.env.WEBAUTHN_RP_ID     || 'localhost';
const RP_ORIGIN = process.env.WEBAUTHN_RP_ORIGIN || 'http://localhost:5173';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function serviceError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function writeAuditLog({ action, userId, credentialId, ipAddress, meta = {} }) {
  try {
    await AuditLog.create({
      action,
      entity: 'WebAuthnCredential',
      entityId: credentialId || new (await import('mongoose')).default.Types.ObjectId(),
      afterData: meta,
      performedBy: userId,
      role: 'System',
      ipAddress,
    });
  } catch {
    // Audit failures must never block the auth flow
  }
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Begin registration: generate options and persist the challenge.
 * Caller must be authenticated (JWT). Returns options to pass to the browser.
 */
export async function beginRegistration({ userId, userAgent }) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw serviceError('User not found or inactive', 404);

  // Exclude credentials already registered on this account so the browser
  // does not offer to overwrite an existing passkey on the same device.
  const existing = await WebAuthnCredential.find({ userId, isActive: true }).select('credentialId transports');
  const excludeCredentials = existing.map((c) => ({
    id: c.credentialId,
    transports: c.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName:   RP_NAME,
    rpID:     RP_ID,
    userName: user.email || user.employeeCode,
    userDisplayName: user.name,
    attestationType: 'none',           // No attestation — maximises device compatibility
    authenticatorSelection: {
      residentKey:             'preferred', // Enables usernameless login on supporting devices
      userVerification:        'required',  // Biometric/PIN must be verified — not just device presence
      authenticatorAttachment: 'platform',  // Built-in sensors only (Touch ID, Face ID, Windows Hello)
    },
    excludeCredentials,
    timeout: 60_000,
  });

  const sessionToken = makeSessionToken();
  await WebAuthnChallenge.create({
    sessionToken,
    challenge: options.challenge,
    type: 'registration',
    userId,
  });

  return { options, sessionToken };
}

/**
 * Verify and persist the credential returned by the browser after registration.
 */
export async function verifyRegistration({ sessionToken, response, deviceName, userAgent, ipAddress }) {
  const stored = await WebAuthnChallenge.findOneAndDelete({
    sessionToken,
    type: 'registration',
  });
  if (!stored) throw serviceError('Challenge not found or expired. Please start over.', 400);
  if (stored.expiresAt < new Date()) throw serviceError('Challenge expired. Please start over.', 400);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin:    RP_ORIGIN,
    expectedRPID:      RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw serviceError('Registration verification failed.', 400);
  }

  const { credential, aaguid, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  // Defend against duplicate credential IDs (same device registered twice)
  const duplicate = await WebAuthnCredential.findOne({ credentialId: credential.id });
  if (duplicate) throw serviceError('This credential is already registered.', 409);

  const cred = await WebAuthnCredential.create({
    userId:     stored.userId,
    credentialId: credential.id,
    publicKey:  Buffer.from(credential.publicKey),
    counter:    credential.counter,
    deviceType: credentialDeviceType,
    backedUp:   credentialBackedUp,
    transports: credential.transports ?? [],
    aaguid,
    deviceName: deviceName?.trim() || 'My Device',
    userAgent:  userAgent?.slice(0, 512),
  });

  await writeAuditLog({
    action: 'WEBAUTHN_CREDENTIAL_REGISTERED',
    userId: stored.userId,
    credentialId: cred._id,
    ipAddress,
    meta: { deviceName: cred.deviceName, aaguid, deviceType: credentialDeviceType },
  });

  return {
    credentialId: cred._id,
    deviceName: cred.deviceName,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  };
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Begin authentication: generate options and persist the challenge.
 * If the caller provides an email, we restrict allowCredentials to that user's
 * passkeys (better UX on shared POS terminals).
 * Without an email the browser shows its own account picker (resident-key flow).
 */
export async function beginAuthentication({ email }) {
  let allowCredentials = [];
  let userId = null;
  let emailHint = null;

  if (email) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && user.isActive) {
      userId = user._id;
      emailHint = user.email;
      const creds = await WebAuthnCredential.find({ userId, isActive: true }).select('credentialId transports');
      allowCredentials = creds.map((c) => ({ id: c.credentialId, transports: c.transports }));
    }
    // If no user found, still proceed with empty allowCredentials so we don't
    // leak which emails are registered (timing-safe non-disclosure).
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'required',
    authenticatorAttachment: 'platform', // Restrict to built-in biometrics; suppresses cross-device QR flow
    timeout: 60_000,
  });

  const sessionToken = makeSessionToken();
  await WebAuthnChallenge.create({
    sessionToken,
    challenge: options.challenge,
    type: 'authentication',
    userId:    userId ?? undefined,
    emailHint: emailHint ?? undefined,
  });

  return { options, sessionToken };
}

/**
 * Verify the assertion from the browser and issue auth data (caller issues JWT).
 */
export async function verifyAuthentication({ sessionToken, response, ipAddress }) {
  const stored = await WebAuthnChallenge.findOneAndDelete({
    sessionToken,
    type: 'authentication',
  });
  if (!stored) throw serviceError('Challenge not found or expired. Please start over.', 400);
  if (stored.expiresAt < new Date()) throw serviceError('Challenge expired. Please start over.', 400);

  // Look up credential by the rawId the authenticator returned
  const credential = await WebAuthnCredential.findOne({
    credentialId: response.id,
    isActive: true,
  });
  if (!credential) throw serviceError('Credential not recognised.', 401);

  // If we started with an email hint, ensure the credential belongs to that user
  if (stored.userId && String(credential.userId) !== String(stored.userId)) {
    throw serviceError('Credential does not match the provided account.', 401);
  }

  const user = await User.findById(credential.userId);
  if (!user || !user.isActive) throw serviceError('Account is inactive.', 401);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin:    RP_ORIGIN,
    expectedRPID:      RP_ID,
    credential: {
      id:         credential.credentialId,
      publicKey:  new Uint8Array(credential.publicKey),
      counter:    credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) throw serviceError('Authentication failed.', 401);

  const { newCounter } = verification.authenticationInfo;

  // Cloned-credential detection: counter must be strictly increasing
  if (newCounter !== 0 && newCounter <= credential.counter) {
    await writeAuditLog({
      action: 'WEBAUTHN_COUNTER_ANOMALY',
      userId: user._id,
      credentialId: credential._id,
      ipAddress,
      meta: { stored: credential.counter, received: newCounter },
    });
    throw serviceError('Credential counter anomaly detected. Contact your administrator.', 401);
  }

  await WebAuthnCredential.findByIdAndUpdate(credential._id, {
    counter: newCounter,
    lastUsedAt: new Date(),
  });

  await writeAuditLog({
    action: 'WEBAUTHN_LOGIN_SUCCESS',
    userId: user._id,
    credentialId: credential._id,
    ipAddress,
    meta: { deviceName: credential.deviceName, newCounter },
  });

  return user;
}

// ── Device management ─────────────────────────────────────────────────────────

export async function listCredentials(userId) {
  return WebAuthnCredential.find({ userId, isActive: true })
    .select('credentialId deviceName deviceType backedUp transports aaguid lastUsedAt createdAt')
    .sort({ createdAt: -1 });
}

export async function revokeCredential({ credentialId, userId, ipAddress }) {
  const cred = await WebAuthnCredential.findOne({ _id: credentialId, userId });
  if (!cred) throw serviceError('Credential not found.', 404);

  await WebAuthnCredential.findByIdAndUpdate(credentialId, { isActive: false });

  await writeAuditLog({
    action: 'WEBAUTHN_CREDENTIAL_REVOKED',
    userId,
    credentialId: cred._id,
    ipAddress,
    meta: { deviceName: cred.deviceName },
  });
}

export async function renameCredential({ credentialId, userId, deviceName }) {
  if (!deviceName?.trim()) throw serviceError('Device name cannot be empty.', 400);
  const cred = await WebAuthnCredential.findOneAndUpdate(
    { _id: credentialId, userId, isActive: true },
    { deviceName: deviceName.trim().slice(0, 80) },
    { new: true }
  );
  if (!cred) throw serviceError('Credential not found.', 404);
  return cred;
}
