import express from 'express';
const router = express.Router();
import { login, signup, verifyEmail, verifyPin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/login',      login);
router.post('/signup',     signup);
router.get('/verify-email', verifyEmail);

// Authenticated-only: verify PIN without issuing a new token (idle lock-screen unlock)
router.post('/verify-pin', protect, verifyPin);

export default router;
