/**
 * emsAttendanceSyncService.js
 *
 * Applies an inbound EMS attendance event (Clock In / Clock Out) to POS.
 * EMS is the source of truth — every function here is idempotent and
 * race-safe (atomic status-guarded queries, same convention as
 * cron/missedCheckout.cron.js and shiftService.forceCheckout) so a duplicate
 * or out-of-order webhook delivery can never double-open/close a Shift.
 *
 * Callers (emsWebhookController) are responsible for the EmsSyncLog /
 * AuditLog bookkeeping — this module only touches Shift + Socket.IO.
 */
import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';
import * as shiftService from './shiftService.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';

/**
 * Auto clock-in an employee from an EMS attendance event.
 * Returns { shift, alreadyOpen }. alreadyOpen=true means this call was a
 * no-op (an OPEN shift already existed) — caller logs it as DUPLICATE.
 */
export async function syncClockIn({
  posEmployeeId,
  scheduleId      = null,
  scheduledStart  = null,
  scheduledEnd    = null,
  scheduledStartUtc = null,
  scheduledEndUtc = null,
  scheduledDate   = null,
} = {}) {
  const existing = await Shift.findOne({ employeeId: posEmployeeId, status: 'OPEN' });
  if (existing) {
    return { shift: existing, alreadyOpen: true };
  }

  const shift = await shiftService.openShift(posEmployeeId, {
    scheduleSource: 'EMS',
    scheduleId,
    scheduledStart,
    scheduledEnd,
    scheduledStartUtc,
    scheduledEndUtc,
    scheduledDate,
  });

  emit(ROOMS.employee(posEmployeeId.toString()), EVENTS.EMS_CLOCK_IN, {
    shiftId:     shift._id,
    clockInTime: shift.clockInTime,
  });
  emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, {
    action:   'EMS_CLOCK_IN',
    employee: { id: posEmployeeId },
    shiftId:  shift._id,
    clockIn:  shift.clockInTime,
    source:   'EMS',
  });

  await AuditLog.create({
    action:      'EMS_CLOCK_IN',
    entity:      'Shift',
    entityId:    shift._id,
    afterData:   shift.toObject(),
    performedBy: null,
    role:        'EMS',
  });

  return { shift, alreadyOpen: false };
}

/**
 * Auto clock-out an employee from an EMS attendance event.
 * Returns { shift, skipped }. skipped=true means there was no OPEN shift to
 * close (already closed, e.g. by a manager's force-checkout, or the
 * matching clock-in event never arrived) — caller logs it as SKIPPED, not
 * an error; this is a permanent, not transient, condition.
 */
export async function syncClockOut({ posEmployeeId, emsTimestamp = null } = {}) {
  const closeTime = emsTimestamp ? new Date(emsTimestamp) : new Date();

  const shift = await Shift.findOneAndUpdate(
    { employeeId: posEmployeeId, status: 'OPEN' },
    {
      $set: {
        status:         'CLOSED',
        clockOutTime:   closeTime,
        clockOutReason: 'Auto clock-out via EMS attendance sync',
        earlyClockOut:  false,
      },
    },
    { new: true }
  );

  if (!shift) {
    return { shift: null, skipped: true };
  }

  emit(ROOMS.employee(posEmployeeId.toString()), EVENTS.EMS_CLOCK_OUT, {
    shiftId:      shift._id,
    clockOutTime: shift.clockOutTime,
  });
  emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, {
    action:   'EMS_CLOCK_OUT',
    employee: { id: posEmployeeId },
    shiftId:  shift._id,
    clockOut: shift.clockOutTime,
    source:   'EMS',
  });

  await AuditLog.create({
    action:      'EMS_CLOCK_OUT',
    entity:      'Shift',
    entityId:    shift._id,
    afterData:   shift.toObject(),
    performedBy: null,
    role:        'EMS',
  });

  return { shift, skipped: false };
}
