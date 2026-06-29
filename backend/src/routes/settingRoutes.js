import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import Setting from '../models/Setting.js';
import { imageUpload } from '../middleware/uploadMiddleware.js';
import { uploadBuffer, deleteFile } from '../services/imagekitService.js';

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

// GET /api/settings/sync-staffing — any authenticated manager/admin
router.get('/sync-staffing', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ syncStaffingBetit: doc?.syncStaffingBetit ?? false });
  } catch (e) { next(e); }
});

// PATCH /api/settings/sync-staffing — managers only
router.patch('/sync-staffing', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const val = Boolean(req.body.syncStaffingBetit);
    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { syncStaffingBetit: val } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ syncStaffingBetit: doc.syncStaffingBetit });
  } catch (e) { next(e); }
});

// GET /api/settings/stock-tracking — any authenticated user (employees need it at terminal/inventory)
router.get('/stock-tracking', protect, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ stockTrackingEnabled: doc?.stockTrackingEnabled ?? true });
  } catch (e) { next(e); }
});

// PATCH /api/settings/stock-tracking — managers only
router.patch('/stock-tracking', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const val = req.body.stockTrackingEnabled === false ? false : true;
    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { stockTrackingEnabled: val } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ stockTrackingEnabled: doc.stockTrackingEnabled });
  } catch (e) { next(e); }
});

// GET /api/settings/logo
router.get('/logo', protect, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ success: true, data: doc?.storeLogo ?? { url: null, fileId: null, fileName: null } });
  } catch (e) { next(e); }
});

// PATCH /api/settings/logo — upload / replace store logo
router.patch('/logo', protect, managerOrAdmin, imageUpload('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const existing = await Setting.findById('global');
    if (existing?.storeLogo?.fileId) await deleteFile(existing.storeLogo.fileId);

    const logoData = await uploadBuffer({
      buffer:   req.file.buffer,
      fileName: 'store-logo',
      folder:   '/pos/logos',
      tags:     ['logo'],
    });

    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { storeLogo: logoData } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: doc.storeLogo });
  } catch (e) { next(e); }
});

// DELETE /api/settings/logo
router.delete('/logo', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    if (doc?.storeLogo?.fileId) await deleteFile(doc.storeLogo.fileId);

    await Setting.findByIdAndUpdate(
      'global',
      { $set: { storeLogo: { url: null, fileId: null, fileName: null } } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Store logo removed.' });
  } catch (e) { next(e); }
});

export default router;
