import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// GET /api/settings/discount-limit — any authenticated user (employees need it)
router.get('/discount-limit', protect, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ maxDiscountPercent: doc?.maxDiscountPercent ?? 10 });
  } catch (e) { next(e); }
});

// PATCH /api/settings/discount-limit — managers only
router.patch('/discount-limit', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const val = Number(req.body.maxDiscountPercent);
    if (isNaN(val) || val < 0 || val > 100) {
      return res.status(400).json({ message: 'maxDiscountPercent must be 0–100' });
    }
    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { maxDiscountPercent: val } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ maxDiscountPercent: doc.maxDiscountPercent });
  } catch (e) { next(e); }
});

export default router;
