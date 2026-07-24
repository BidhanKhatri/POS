import User from '../models/User.js';
import Setting from '../models/Setting.js';
import EmsSyncLog from '../models/EmsSyncLog.js';
import * as emsAttendanceSyncService from '../services/emsAttendanceSyncService.js';

/**
 * Resolve an EMS employee reference to a POS User.
 * staffingBetitEmployeeId first (exact link), falling back to email —
 * mirrors the same two-key matching convention as groupSyncService/
 * staffingService already use elsewhere in this codebase.
 */
async function matchPosEmployee({ staffingBetitEmployeeId, email }) {
  if (staffingBetitEmployeeId) {
    const user = await User.findOne({ staffingBetitEmployeeId });
    if (user) return { user, matchMethod: 'staffingBetitEmployeeId', matchValue: staffingBetitEmployeeId };
  }
  if (email) {
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (user) return { user, matchMethod: 'email', matchValue: email };
  }
  return { user: null, matchMethod: 'none', matchValue: staffingBetitEmployeeId || email || null };
}

/**
 * POST /api/integrations/ems/attendance
 * Signature/timestamp already verified by emsWebhookAuth before this runs.
 *
 * Contract (see docs/EMS_WEBHOOK_CONTRACT.md):
 * {
 *   eventId: string (unique per event — idempotency key),
 *   type: 'CLOCK_IN' | 'CLOCK_OUT',
 *   employee: { staffingBetitEmployeeId?: string, email?: string },
 *   timestamp: string (ISO — when the clock event actually happened in EMS),
 *   scheduleId?, scheduledStart?, scheduledEnd?, scheduledStartUtc?, scheduledEndUtc?, scheduledDate?
 * }
 *
 * Response status contract (EMS should only retry on 5xx):
 *   200 — processed (success, duplicate, or a permanent skip like "already closed")
 *   401 — bad/missing signature (fix EMS's signing, do not retry as-is)
 *   403 — sync disabled for this store (do not retry)
 *   422 — no matching POS employee, or malformed payload (do not retry)
 *   500 — unexpected server error (safe to retry with backoff)
 */
export async function receiveAttendanceEvent(req, res, next) {
  const { eventId, type, employee, timestamp, scheduleId, scheduledStart, scheduledEnd, scheduledStartUtc, scheduledEndUtc, scheduledDate } = req.body || {};

  try {
    if (!eventId || !['CLOCK_IN', 'CLOCK_OUT'].includes(type) || !employee) {
      return res.status(422).json({ success: false, message: 'eventId, type (CLOCK_IN|CLOCK_OUT), and employee are required' });
    }

    // Idempotency — a duplicate delivery of an already-processed event is a
    // safe no-op, not an error, so EMS's own retry logic never causes a
    // double clock-in/out.
    const alreadyLogged = await EmsSyncLog.findOne({ emsEventId: eventId });
    if (alreadyLogged) {
      return res.status(200).json({ success: true, status: 'duplicate' });
    }

    const setting = await Setting.findById('global');
    if (!setting?.syncStaffingBetit) {
      await EmsSyncLog.create({
        emsEventId: eventId, eventType: type, matchMethod: 'none',
        status: 'REJECTED', errorMessage: 'Sync Staffing Betit is disabled for this store',
        rawPayload: req.body,
      });
      return res.status(403).json({ success: false, message: 'Sync Staffing Betit is disabled for this store' });
    }

    const { user, matchMethod, matchValue } = await matchPosEmployee(employee);
    if (!user) {
      await EmsSyncLog.create({
        emsEventId: eventId, eventType: type, matchMethod, matchValue,
        status: 'REJECTED', errorMessage: 'No matching POS employee for this EMS identity',
        rawPayload: req.body,
      });
      return res.status(422).json({ success: false, message: 'No matching POS employee for this EMS identity' });
    }

    const emsTimestamp = timestamp ? new Date(timestamp) : null;

    if (type === 'CLOCK_IN') {
      const { shift, alreadyOpen } = await emsAttendanceSyncService.syncClockIn({
        posEmployeeId: user._id,
        scheduleId, scheduledStart, scheduledEnd, scheduledStartUtc, scheduledEndUtc, scheduledDate,
      });
      await EmsSyncLog.create({
        emsEventId: eventId, eventType: type, matchMethod, matchValue,
        posEmployeeId: user._id, shiftId: shift._id,
        status: alreadyOpen ? 'DUPLICATE' : 'SUCCESS',
        emsTimestamp, rawPayload: req.body,
      });
      return res.status(200).json({ success: true, status: alreadyOpen ? 'duplicate' : 'success', shiftId: shift._id });
    }

    // CLOCK_OUT
    const { shift, skipped } = await emsAttendanceSyncService.syncClockOut({
      posEmployeeId: user._id,
      emsTimestamp,
    });
    await EmsSyncLog.create({
      emsEventId: eventId, eventType: type, matchMethod, matchValue,
      posEmployeeId: user._id, shiftId: shift?._id ?? null,
      status: skipped ? 'SKIPPED' : 'SUCCESS',
      errorMessage: skipped ? 'No open POS shift found for this employee' : null,
      emsTimestamp, rawPayload: req.body,
    });
    return res.status(200).json({ success: true, status: skipped ? 'skipped' : 'success', shiftId: shift?._id ?? null });
  } catch (error) {
    try {
      await EmsSyncLog.create({
        emsEventId:  eventId || `error-${Date.now()}`,
        eventType:   ['CLOCK_IN', 'CLOCK_OUT'].includes(type) ? type : 'CLOCK_IN',
        matchMethod: 'none',
        status:      'ERROR',
        errorMessage: error.message,
        rawPayload:  req.body,
      });
    } catch { /* logging must never mask the original error */ }
    next(error);
  }
}

/**
 * GET /api/integrations/ems/sync-log — manager/admin only.
 * Paginated read of recent sync attempts, for support/debugging.
 */
export async function listSyncLog(req, res, next) {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);

    const [rows, total] = await Promise.all([
      EmsSyncLog.find()
        .populate('posEmployeeId', 'name employeeCode')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmsSyncLog.countDocuments(),
    ]);

    res.status(200).json({ success: true, data: rows, page, limit, total });
  } catch (error) {
    next(error);
  }
}
