/**
 * Shift ending soon — runs every minute. Warns any employee whose OPEN shift
 * has a scheduled end time within the next 15 minutes, via a socket push to
 * their personal room (`employee:{id}`), so the Terminal page can show a
 * live "your shift ends soon" banner without the employee refreshing.
 *
 * `scheduledEnd`/`scheduledDate` are plain HH:mm / YYYY-MM-DD strings copied
 * onto the Shift at clock-in — same fields TerminalPage.jsx already uses
 * client-side for its own stale-shift gating, so the end-time math here
 * mirrors that logic (including overnight shift rollover).
 */

import Shift from '../models/Shift.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';

const WARNING_WINDOW_MS = 15 * 60 * 1000;

function computeScheduledEndDate(shift) {
  const [h, m] = shift.scheduledEnd.split(':').map(Number);
  const base = shift.scheduledDate
    ? new Date(shift.scheduledDate + 'T00:00:00')
    : new Date(shift.shiftDate);
  const endDT = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);

  // Overnight shift (end time is earlier than start time) — end lands the next day.
  if (shift.scheduledStart) {
    const [sh, sm] = shift.scheduledStart.split(':').map(Number);
    if (h * 60 + m <= sh * 60 + sm) endDT.setDate(endDT.getDate() + 1);
  }
  return endDT;
}

export async function runShiftEndingSoonCheck() {
  const shifts = await Shift.find({
    status: 'OPEN',
    scheduledEnd: { $ne: null },
    endingSoonNotifiedAt: null,
  });
  if (!shifts.length) return;

  const now = new Date();

  for (const shift of shifts) {
    const endDT = computeScheduledEndDate(shift);
    const msUntilEnd = endDT - now;

    // Fire once the shift is within the warning window, up until it actually ends —
    // the cron runs once a minute so this is a window check, not an exact T-15 hit.
    if (msUntilEnd <= WARNING_WINDOW_MS && msUntilEnd > 0) {
      emit(ROOMS.employee(shift.employeeId.toString()), EVENTS.SHIFT_ENDING_SOON, {
        shiftId: shift._id,
        scheduledEnd: endDT,
        minutesLeft: Math.max(1, Math.round(msUntilEnd / 60000)),
      });
      shift.endingSoonNotifiedAt = now;
      await shift.save();
    }
  }
}
