import express from 'express';
const router = express.Router();
import {
  processSale, completeSale, searchSales,
  getSaleDetail, listTransactions, emailReceipt,
  managerSaleDetail, transactionKpis, listEmployees,
} from '../controllers/saleController.js';
import { protect, managerOrAdmin, requireActiveShift, requireShiftNotEnded } from '../middleware/authMiddleware.js';

// Initiating or completing a sale requires an active (clocked-in) shift for employees.
// New sale creation additionally requires the shift not be past its scheduled end,
// with a short 2-minute grace period covering someone already mid card-entry when
// the clock hit. /complete is left ungated — an already-approved override finalize
// (or the tail end of an in-progress sale) must never be blocked here.
router.post('/',              protect, requireActiveShift, requireShiftNotEnded(2), processSale);
router.post('/:id/complete',  protect, requireActiveShift, completeSale);

router.get('/',           protect, listTransactions);
router.get('/search',     protect, searchSales);
router.get('/kpis',       protect, managerOrAdmin, transactionKpis);
router.get('/employees',  protect, managerOrAdmin, listEmployees);
router.post('/:invoiceNo/email-receipt', protect, emailReceipt);
router.get('/:id/manager-detail',        protect, managerOrAdmin, managerSaleDetail);
router.get('/:id',                       protect, getSaleDetail);

export default router;
