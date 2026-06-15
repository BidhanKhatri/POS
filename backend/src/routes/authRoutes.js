import express from 'express';
const router = express.Router();
import { clerkWebhook, login, signup, syncClerkUser } from '../controllers/authController.js';

router.post('/login', login);
router.post('/signup', signup);
router.post('/clerk/sync', syncClerkUser);
router.post('/clerk/webhook', clerkWebhook);


export default router;
