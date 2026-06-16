import express from 'express';
const router = express.Router();
import { processSale, searchSales, getSaleDetail } from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/', protect, processSale);
router.get('/search', protect, searchSales);
router.get('/:id', protect, getSaleDetail);

export default router;
