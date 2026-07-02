import jwt from 'jsonwebtoken';
import * as webauthnService from '../services/webauthnService.js';
import { issueRefreshToken } from '../services/authService.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/webauthn/register/begin
 * Protected — user must be JWT-authenticated (email+PIN) first.
 * Returns WebAuthn registration options for the browser.
 */
export const registerBegin = async (req, res, next) => {
  try {
    const { options, sessionToken } = await webauthnService.beginRegistration({
      userId:    req.user._id,
      userAgent: req.headers['user-agent'],
    });
    res.status(200).json({ options, sessionToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/webauthn/register/verify
 * Protected — user must be JWT-authenticated.
 * Body: { sessionToken, response, deviceName? }
 */
export const registerVerify = async (req, res, next) => {
  try {
    const { sessionToken, response, deviceName } = req.body;
    if (!sessionToken || !response) {
      return res.status(400).json({ message: 'sessionToken and response are required.' });
    }

    const result = await webauthnService.verifyRegistration({
      sessionToken,
      response,
      deviceName,
      userAgent:  req.headers['user-agent'],
      ipAddress:  getIP(req),
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/webauthn/auth/begin
 * Public — no JWT required (this IS the login).
 * Body: { email? }  — optional email hint for shared terminals
 */
export const authBegin = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { options, sessionToken } = await webauthnService.beginAuthentication({ email });
    res.status(200).json({ options, sessionToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/webauthn/auth/verify
 * Public — issues JWT on success.
 * Body: { sessionToken, response }
 */
export const authVerify = async (req, res, next) => {
  try {
    const { sessionToken, response, deviceId, deviceName } = req.body;
    if (!sessionToken || !response) {
      return res.status(400).json({ message: 'sessionToken and response are required.' });
    }

    const user = await webauthnService.verifyAuthentication({
      sessionToken,
      response,
      ipAddress: getIP(req),
    });

    let refreshToken = null;
    if (deviceId) {
      refreshToken = await issueRefreshToken(
        user._id, deviceId,
        deviceName || 'POS Terminal',
        getIP(req)
      );
    }

    res.status(200).json({
      _id:          user._id,
      employeeCode: user.employeeCode,
      name:         user.name,
      email:        user.email,
      role:         user.role,
      isActive:     user.isActive,
      token:        generateToken(user._id),
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Device management ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/webauthn/credentials
 * Protected — lists current user's registered passkeys.
 */
export const listCredentials = async (req, res, next) => {
  try {
    const creds = await webauthnService.listCredentials(req.user._id);
    res.status(200).json(creds);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/auth/webauthn/credentials/:id
 * Protected — revokes one passkey.
 */
export const revokeCredential = async (req, res, next) => {
  try {
    await webauthnService.revokeCredential({
      credentialId: req.params.id,
      userId:       req.user._id,
      ipAddress:    getIP(req),
    });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/auth/webauthn/credentials/:id
 * Protected — renames one passkey.
 * Body: { deviceName }
 */
export const renameCredential = async (req, res, next) => {
  try {
    const { deviceName } = req.body;
    const cred = await webauthnService.renameCredential({
      credentialId: req.params.id,
      userId:       req.user._id,
      deviceName,
    });
    res.status(200).json(cred);
  } catch (err) {
    next(err);
  }
};
