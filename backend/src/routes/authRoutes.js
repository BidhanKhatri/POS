import express from 'express';
const router = express.Router();
import { login, signup, verifyEmail } from '../controllers/authController.js';

router.post('/login', login);
router.post('/signup', signup);
router.get('/verify-email', verifyEmail);

export default router;
