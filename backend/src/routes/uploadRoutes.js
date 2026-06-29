import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAuthParams } from '../services/imagekitService.js';

const router = express.Router();

// GET /api/upload/auth — ImageKit server-side auth params for client-side uploads
router.get('/auth', protect, (req, res) => {
  res.json(getAuthParams());
});

export default router;
