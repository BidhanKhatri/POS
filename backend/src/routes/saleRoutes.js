import express from 'express';
const router = express.Router();
import { processSale } from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/', protect, processSale);

export default router;
