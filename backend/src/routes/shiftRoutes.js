import express from 'express';
const router = express.Router();
import { clockIn, clockOut, getMyActiveShift, recoverClockOut, getActiveShifts, getMissedCheckouts, forceCheckout } from '../controllers/shiftController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

router.post('/clock-in',         protect, clockIn);
router.post('/clock-out',        protect, clockOut);
router.post('/recover-clockout', protect, recoverClockOut);
router.get('/active',            protect, getMyActiveShift);

router.get('/active-all',            protect, managerOrAdmin, getActiveShifts);
router.get('/missed-checkouts',      protect, managerOrAdmin, getMissedCheckouts);
router.post('/:id/force-checkout',   protect, managerOrAdmin, forceCheckout);

export default router;
