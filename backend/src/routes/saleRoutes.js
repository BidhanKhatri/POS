import express from 'express';
const router = express.Router();
import {
  processSale, completeSale, searchSales,
  getSaleDetail, listTransactions, emailReceipt,
  managerSaleDetail, transactionKpis, listEmployees,
} from '../controllers/saleController.js';
import { protect, managerOrAdmin, requireActiveShift } from '../middleware/authMiddleware.js';

// Initiating or completing a sale requires an active (clocked-in) shift for employees
router.post('/',              protect, requireActiveShift, processSale);
router.post('/:id/complete',  protect, requireActiveShift, completeSale);

router.get('/',           protect, listTransactions);
router.get('/search',     protect, searchSales);
router.get('/kpis',       protect, managerOrAdmin, transactionKpis);
router.get('/employees',  protect, managerOrAdmin, listEmployees);
router.post('/:invoiceNo/email-receipt', protect, emailReceipt);
router.get('/:id/manager-detail',        protect, managerOrAdmin, managerSaleDetail);
router.get('/:id',                       protect, getSaleDetail);

export default router;
