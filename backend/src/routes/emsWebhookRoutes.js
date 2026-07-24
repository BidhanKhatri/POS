import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import emsWebhookAuth from '../middleware/emsWebhookAuth.js';
import { receiveAttendanceEvent, listSyncLog } from '../controllers/emsWebhookController.js';

const router = express.Router();

/**
 * POST /api/integrations/ems/attendance
 * Service-to-service only — EMS calling in, not a logged-in POS user, so this
 * uses emsWebhookAuth (HMAC signature + timestamp) instead of `protect`.
 * See docs/EMS_WEBHOOK_CONTRACT.md for the full payload/header contract.
 */
router.post('/attendance', emsWebhookAuth, receiveAttendanceEvent);

/**
 * GET /api/integrations/ems/sync-log
 * Manager / Admin only — recent sync attempts, for support/debugging.
 */
router.get('/sync-log', protect, managerOrAdmin, listSyncLog);

export default router;
