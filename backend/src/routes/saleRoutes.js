import express from 'express';
const router = express.Router();
import {
  processSale, completeSale, searchSales,
  getSaleDetail, listTransactions, emailReceipt,
  managerSaleDetail, transactionKpis, listEmployees,
} from '../controllers/saleController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

router.post('/',          protect,                processSale);
router.get('/',           protect,                listTransactions);
router.get('/search',     protect,                searchSales);
// Manager-only aggregate and employee list (before /:id to avoid param capture)
router.get('/kpis',       protect, managerOrAdmin, transactionKpis);
router.get('/employees',  protect, managerOrAdmin, listEmployees);
// Named sub-routes before /:id
router.post('/:id/complete',          protect, completeSale);
router.post('/:invoiceNo/email-receipt', protect, emailReceipt);
// Manager full detail (overrides + audit trail) — privileged variant
router.get('/:id/manager-detail',    protect, managerOrAdmin, managerSaleDetail);
router.get('/:id',                   protect, getSaleDetail);

export default router;
