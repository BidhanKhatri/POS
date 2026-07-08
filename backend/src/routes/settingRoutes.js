import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import Setting from '../models/Setting.js';
import { imageUpload } from '../middleware/uploadMiddleware.js';
import { uploadBuffer, deleteFile } from '../services/imagekitService.js';
import { isValidTimeZone, computeNextRunUtc } from '../utils/timezone.js';
import { runDailyReport } from '../cron/dailyReport.cron.js';

const router = express.Router();

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

// GET /api/settings/store-name — any authenticated user (shown in headers)
router.get('/store-name', protect, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    res.json({ storeName: doc?.storeName ?? '' });
  } catch (e) { next(e); }
});

// PATCH /api/settings/store-name — managers only
router.patch('/store-name', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const val = typeof req.body.storeName === 'string' ? req.body.storeName.trim().slice(0, 60) : '';
    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { storeName: val } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ storeName: doc.storeName });
  } catch (e) { next(e); }
});

const DEFAULT_REPORT_RECIPIENTS = ['staffingbetit@gmail.com'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/settings/report-recipients — managers/admins only
router.get('/report-recipients', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global');
    const recipients = doc?.reportRecipients?.length ? doc.reportRecipients : DEFAULT_REPORT_RECIPIENTS;
    res.json({ recipients });
  } catch (e) { next(e); }
});

// PATCH /api/settings/report-recipients — managers/admins only
// Body: { recipients: string[] }
router.patch('/report-recipients', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const input = Array.isArray(req.body.recipients) ? req.body.recipients : [];
    const cleaned = [...new Set(input.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];

    if (cleaned.length === 0) {
      return res.status(400).json({ message: 'At least one email address is required.' });
    }
    const invalid = cleaned.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid email address: ${invalid.join(', ')}` });
    }

    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: { reportRecipients: cleaned } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ recipients: doc.reportRecipients });
  } catch (e) { next(e); }
});

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function shapeDailyReport(doc) {
  const cfg = doc?.dailyReport ?? {};
  return {
    enabled:    cfg.enabled    ?? true,
    time:       cfg.time       ?? '18:00',
    timezone:   cfg.timezone   ?? 'America/New_York',
    lastSentAt: cfg.lastSentAt ?? null,
  };
}

// GET /api/settings/daily-report — managers/admins only
router.get('/daily-report', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const doc = await Setting.findById('global').select('dailyReport').lean();
    const cfg = shapeDailyReport(doc);
    res.json({ ...cfg, nextRunAt: cfg.enabled ? computeNextRunUtc(cfg.time, cfg.timezone) : null });
  } catch (e) { next(e); }
});

// PATCH /api/settings/daily-report — managers/admins only
// Body: { enabled?, time?, timezone? } — any subset; takes effect on the very
// next cron tick (max 1 minute), no server restart required.
router.patch('/daily-report', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const { enabled, time, timezone } = req.body;

    if (time !== undefined && !TIME_RE.test(time)) {
      return res.status(400).json({ message: 'time must be in 24-hour HH:mm format.' });
    }
    if (timezone !== undefined && !isValidTimeZone(timezone)) {
      return res.status(400).json({ message: `Invalid IANA timezone: "${timezone}".` });
    }

    const update = {};
    if (enabled !== undefined) update['dailyReport.enabled'] = Boolean(enabled);
    if (time !== undefined) update['dailyReport.time'] = time;
    if (timezone !== undefined) update['dailyReport.timezone'] = timezone;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided.' });
    }

    const doc = await Setting.findByIdAndUpdate(
      'global',
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const cfg = shapeDailyReport(doc);
    res.json({ ...cfg, nextRunAt: cfg.enabled ? computeNextRunUtc(cfg.time, cfg.timezone) : null });
  } catch (e) { next(e); }
});

// POST /api/settings/daily-report/send-now — managers/admins only
// Manually triggers today's Daily Report immediately: one send attempt, no
// retry/backoff delay, and bypasses the once-per-day dedupe (so it's usable
// right after changing the schedule/recipients without waiting for tomorrow).
// Does NOT touch dailyReport.lastSentAt, so it never interferes with — or
// counts as — the automatic scheduled send for today.
router.post('/daily-report/send-now', protect, managerOrAdmin, async (req, res, next) => {
  try {
    const result = await runDailyReport({ force: true });
    if (result?.success) {
      res.json({ success: true, message: 'Report sent.', recipients: result.recipients ?? [] });
    } else {
      res.status(502).json({ success: false, message: result?.error || 'Report failed to send. Check server logs.' });
    }
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
