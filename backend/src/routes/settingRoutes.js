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

// GET /api/settings/price-variance-limit — any authenticated user (employees need it at checkout)
router.get('/price-variance-limit', protect, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ maxPriceVariancePercent: doc?.maxPriceVariancePercent ?? 10 });
  } catch (e) { next(e); }
});

// PATCH /api/settings/price-variance-limit — managers only
router.patch('/price-variance-limit', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const val = Number(req.body.maxPriceVariancePercent);
    if (isNaN(val) || val < 0 || val > 100) {
      return res.status(400).json({ message: 'maxPriceVariancePercent must be 0–100' });
    }
    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { maxPriceVariancePercent: val } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ maxPriceVariancePercent: doc.maxPriceVariancePercent });
  } catch (e) { next(e); }
});

export default router;
