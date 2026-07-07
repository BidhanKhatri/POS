/**
 * Shared scheduled-shift-end computation, used by anything that needs to
 * know the absolute wall-clock Date a shift is scheduled to end:
 *   - cron/shiftEndingSoon.cron.js  (ending-soon warning)
 *   - cron/missedCheckout.cron.js   (missed-checkout detection)
 *   - middleware/authMiddleware.js  (requireShiftNotEnded)
 *
 * `scheduledEnd`/`scheduledStart` are plain HH:mm strings, `scheduledDate`
 * is a YYYY-MM-DD string — all copied onto the Shift at clock-in time.
 *
 * Note: this is intentionally NOT used by shiftService.closeShift's own
 * early-clock-out math, which is keyed off clockInTime's date to answer a
 * different question ("was this early relative to when I started") rather
 * than "what is the absolute scheduled end" — don't unify the two.
 */
export function computeScheduledEndDate(shift) {
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
