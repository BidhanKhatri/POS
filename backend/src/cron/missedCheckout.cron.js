/**
 * Missed checkout detection — runs every minute. Finds any OPEN shift whose
 * scheduled end has already passed and the employee never clocked out.
 *
 * On detection:
 *   - Employee's terminal is instantly locked via a SHIFT_ENDED socket push
 *     to their personal room (`employee:{id}`).
 *   - Managers are notified via a socket push so the dashboard's "Missed
 *     Checkouts" widget refreshes without a manual reload.
 *   - An AuditLog entry is written (system-generated — no human actor, so
 *     performedBy/role are null/'System').
 *
 * The dedupe flag (`missedCheckoutDetectedAt`) is flipped with an atomic
 * findOneAndUpdate (not load-then-save) so a concurrent employee clock-out
 * landing in the same tick can never be silently overwritten — if zero
 * documents match (status already flipped to CLOSED, or already flagged),
 * this shift is simply skipped.
 */

import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';
import { computeScheduledEndDate } from '../utils/shiftTime.js';

export async function runMissedCheckoutCheck() {
  const shifts = await Shift.find({
    status: 'OPEN',
    scheduledEnd: { $ne: null },
    missedCheckoutDetectedAt: null,
  });
  if (!shifts.length) return;

  const now = new Date();

  for (const shift of shifts) {
    const endDT = computeScheduledEndDate(shift);
    if (now <= endDT) continue;

    const updated = await Shift.findOneAndUpdate(
      { _id: shift._id, status: 'OPEN', missedCheckoutDetectedAt: null },
      { $set: { missedCheckoutDetectedAt: now } },
      { new: true }
    );
    if (!updated) continue; // already closed/flagged by something else in this same tick

    emit(ROOMS.employee(updated.employeeId.toString()), EVENTS.SHIFT_ENDED, {
      shiftId: updated._id,
      scheduledEnd: endDT,
    });
    emit(ROOMS.MANAGERS, EVENTS.MISSED_CHECKOUT_DETECTED, {
      shiftId: updated._id,
      employeeId: updated.employeeId,
    });

    await AuditLog.create({
      action: 'MISSED_CHECKOUT_DETECTED',
      entity: 'Shift',
      entityId: updated._id,
      afterData: {
        employeeId: updated.employeeId,
        scheduledEnd: endDT,
        clockInTime: updated.clockInTime,
      },
      performedBy: null,
      role: 'System',
    });
  }
}
