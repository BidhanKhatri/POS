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
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

router.route('/')
  .get(protect, managerOrAdmin, getOverrides)
  .post(protect, createRefundRequest);

// Specific named sub-routes must come before /:id to avoid being swallowed.
router.route('/discount').post(protect, createDiscountOverride);
router.route('/void').post(protect, createVoidRequest);
router.route('/price-change').post(protect, createPriceChangeOverride);
router.route('/mine').get(protect, getMyOverrides);

router.route('/:id').get(protect, getOverrideById);
router.route('/:id/approve').post(protect, managerOrAdmin, approveOverride);
router.route('/:id/deny').post(protect, managerOrAdmin, denyOverride);

export default router;
