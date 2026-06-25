import * as authService from '../services/authService.js';
import User from '../models/User.js';

/**
 * POST /api/auth/verify-pin
 * Access: any authenticated user
 * Verifies the user's PIN without issuing a new token.
 * Used by the idle lock-screen to re-authenticate in place.
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

const login = async (req, res, next) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      res.status(400);
      throw new Error('Please provide email and PIN');
    }
    const user = await authService.loginUser(email, pin);
    res.status(200).json(user);
  } catch (error) {
    if (error.accountStatus) {
      return res.status(403).json({ message: error.message, accountStatus: error.accountStatus });
    }
    next(error);
  }
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
