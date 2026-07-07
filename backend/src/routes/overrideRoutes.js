import express from 'express';
const router = express.Router();
import {
  createRefundRequest,
  createDiscountOverride,
  createVoidRequest,
  createPriceChangeOverride,
  getOverrideById,
  getOverrides,
  getMyOverrides,
  approveOverride,
  denyOverride,
} from '../controllers/overrideController.js';
import { protect, managerOrAdmin, requireActiveShift, requireShiftNotEnded } from '../middleware/authMiddleware.js';

// Employee-initiated transactions require an active shift, and (unlike sale
// creation) are blocked immediately once the shift has ended — no grace period.
router.route('/')
  .get(protect, managerOrAdmin, getOverrides)
  .post(protect, requireActiveShift, requireShiftNotEnded(), createRefundRequest);

router.route('/discount').post(protect,   requireActiveShift, requireShiftNotEnded(), createDiscountOverride);
router.route('/void').post(protect,       requireActiveShift, requireShiftNotEnded(), createVoidRequest);
router.route('/price-change').post(protect, requireActiveShift, requireShiftNotEnded(), createPriceChangeOverride);
router.route('/mine').get(protect, getMyOverrides);

router.route('/:id').get(protect, getOverrideById);
router.route('/:id/approve').post(protect, managerOrAdmin, approveOverride);
router.route('/:id/deny').post(protect,    managerOrAdmin, denyOverride);

export default router;
