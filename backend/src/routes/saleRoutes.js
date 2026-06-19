import express from 'express';
const router = express.Router();
import { processSale, completeSale, searchSales, getSaleDetail, listTransactions, emailReceipt } from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/', protect, processSale);
router.get('/', protect, listTransactions);
router.get('/search', protect, searchSales);
// Named sub-routes before /:id to prevent param capture
router.post('/:id/complete', protect, completeSale);
router.post('/:invoiceNo/email-receipt', protect, emailReceipt);
router.get('/:id', protect, getSaleDetail);

export default router;
