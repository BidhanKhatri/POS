import express from 'express';
const router = express.Router();
import { clockIn, clockOut, getMyActiveShift, recoverClockOut } from '../controllers/shiftController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/clock-in',         protect, clockIn);
router.post('/clock-out',        protect, clockOut);
router.post('/recover-clockout', protect, recoverClockOut);
router.get('/active',            protect, getMyActiveShift);

export default router;
