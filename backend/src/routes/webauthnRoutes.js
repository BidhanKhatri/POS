import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerBegin,
  registerVerify,
  authBegin,
  authVerify,
  listCredentials,
  revokeCredential,
  renameCredential,
} from '../controllers/webauthnController.js';

const router = express.Router();

// Stricter rate limit for WebAuthn endpoints to resist brute-force and
// challenge-harvesting attacks (10 requests per 15 min per IP).
const webAuthnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again later.' },
  skipSuccessfulRequests: false,
});

// Registration (requires an existing JWT — user proves identity via PIN first)
router.post('/register/begin',  webAuthnLimiter, protect, registerBegin);
router.post('/register/verify', webAuthnLimiter, protect, registerVerify);

// Authentication (public — this IS the login ceremony)
router.post('/auth/begin',  webAuthnLimiter, authBegin);
router.post('/auth/verify', webAuthnLimiter, authVerify);

// Device management (protected)
router.get('/credentials',        protect, listCredentials);
router.delete('/credentials/:id', protect, revokeCredential);
router.patch('/credentials/:id',  protect, renameCredential);

export default router;
