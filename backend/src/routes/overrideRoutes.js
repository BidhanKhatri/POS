import express from 'express';
const router = express.Router();
import {
  createRefundRequest,
  getOverrides,
  getMyOverrides,
  approveOverride,
  denyOverride,
} from '../controllers/overrideController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

router.route('/')
  .get(protect, managerOrAdmin, getOverrides)
  .post(protect, createRefundRequest);

router.route('/mine').get(protect, getMyOverrides);
router.route('/:id/approve').post(protect, managerOrAdmin, approveOverride);
router.route('/:id/deny').post(protect, managerOrAdmin, denyOverride);

export default router;
