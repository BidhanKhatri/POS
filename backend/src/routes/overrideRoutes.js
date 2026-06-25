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
import { protect, managerOrAdmin, requireActiveShift } from '../middleware/authMiddleware.js';

// Employee-initiated transactions require an active shift
router.route('/')
  .get(protect, managerOrAdmin, getOverrides)
  .post(protect, requireActiveShift, createRefundRequest);

router.route('/discount').post(protect,   requireActiveShift, createDiscountOverride);
router.route('/void').post(protect,       requireActiveShift, createVoidRequest);
router.route('/price-change').post(protect, requireActiveShift, createPriceChangeOverride);
router.route('/mine').get(protect, getMyOverrides);

router.route('/:id').get(protect, getOverrideById);
router.route('/:id/approve').post(protect, managerOrAdmin, approveOverride);
router.route('/:id/deny').post(protect,    managerOrAdmin, denyOverride);

export default router;
