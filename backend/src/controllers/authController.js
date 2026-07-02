import * as authService from '../services/authService.js';
import User from '../models/User.js';

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

/**
 * POST /api/auth/verify-pin
 * Protected — verify the user's PIN without issuing a new token (idle lock-screen unlock).
 */
export const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, message: 'PIN required.' });

    const user = await User.findById(req.user._id).select('+pinHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const valid = await user.matchPin(String(pin));
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect PIN.' });

    res.json({ success: true, message: 'PIN verified.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/auth/login
 * Public — Email + PIN login.
 * Accepts optional { deviceId, deviceName } to establish a trusted device session.
 * Returns user data + JWT + refreshToken (if deviceId provided).
 */
const login = async (req, res, next) => {
  try {
    const { email, pin, deviceId, deviceName } = req.body;
    if (!email || !pin) {
      res.status(400);
      throw new Error('Please provide email and PIN');
    }

    const user = await authService.loginUser(email, pin);

    let refreshToken = null;
    if (deviceId) {
      refreshToken = await authService.issueRefreshToken(
        user._id, deviceId,
        deviceName || 'POS Terminal',
        getIP(req)
      );
    }

    res.status(200).json({ ...user, refreshToken });
  } catch (error) {
    if (error.accountStatus) {
      return res.status(403).json({ message: error.message, accountStatus: error.accountStatus });
    }
    if (error.emailFound !== undefined) {
      return res.status(401).json({
        message:     error.message,
        emailFound:  error.emailFound,
        attempts:    error.attempts    ?? undefined,
        lockedUntil: error.lockedUntil ?? undefined,
      });
    }
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Public — exchange a refresh token for a new access token (token rotation).
 * Body: { refreshToken, deviceId }
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken, deviceId } = req.body;
    if (!refreshToken || !deviceId) {
      return res.status(400).json({ message: 'refreshToken and deviceId are required' });
    }
    const result = await authService.refreshSession(refreshToken, deviceId);
    res.json(result);
  } catch (err) {
    if (err.statusCode === 401) return res.status(401).json({ message: err.message });
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Public (no JWT required) — revoke a trusted device session.
 * Body: { refreshToken, deviceId }
 */
export const logoutSession = async (req, res, next) => {
  try {
    const { refreshToken, deviceId } = req.body;
    await authService.revokeSession(refreshToken, deviceId);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const signup = async (req, res, next) => {
  try {
    const { name, email, pin } = req.body;
    if (!name || !email || !pin) {
      res.status(400);
      throw new Error('Please provide name, email and PIN');
    }
    if (!/^\d{4}$/.test(pin)) {
      res.status(400);
      throw new Error('PIN must be exactly 4 digits');
    }
    const result = await authService.registerUser({ name, email, pin, role: 'Employee' });
    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const user = await authService.verifyEmail(token);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams({ code: user.employeeCode, email: user.email });
    res.redirect(`${frontendUrl}/signup/verified?${params.toString()}`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const msg = encodeURIComponent(error.message || 'Verification failed.');
    res.redirect(`${frontendUrl}/signup/verified?error=${msg}`);
  }
};

export { login, signup, verifyEmail };
