import express from 'express';
import rateLimit from 'express-rate-limit';
const router = express.Router();
import { login, signup, verifyEmail, verifyPin, refresh, logoutSession } from '../controllers/authController.js';
import { requestOtp, verifyOtp, resetPin } from '../controllers/pinResetController.js';
import { protect } from '../middleware/authMiddleware.js';

// Strict rate limit for OTP endpoints — 5 requests per IP per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',       login);
router.post('/signup',      signup);
router.post('/refresh',     refresh);
router.post('/logout',      logoutSession);
router.get('/verify-email', verifyEmail);

// Forgot PIN flow — unauthenticated, rate-limited
router.post('/forgot-pin/request', otpLimiter, requestOtp);
router.post('/forgot-pin/verify',  otpLimiter, verifyOtp);
router.post('/forgot-pin/reset',   otpLimiter, resetPin);

// Authenticated-only: verify PIN without issuing a new token (idle lock-screen unlock)
router.post('/verify-pin', protect, verifyPin);

export default router;
