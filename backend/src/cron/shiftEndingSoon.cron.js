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
import { computeScheduledEndDate } from '../utils/shiftTime.js';

const WARNING_WINDOW_MS = 15 * 60 * 1000;

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
