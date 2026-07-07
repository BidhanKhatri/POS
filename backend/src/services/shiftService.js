import Shift from '../models/Shift.js';
import { computeScheduledEndDate } from '../utils/shiftTime.js';

/**
 * Open (clock-in) a shift.
 * Accepts optional schedule metadata captured from EMS/POS schedule at clock-in.
 */
const openShift = async (employeeId, {
  openingCash    = 0,
  scheduleId     = null,
  scheduleSource = 'MANUAL',
  scheduledStart = null,
  scheduledEnd   = null,
  scheduledDate  = null,
} = {}) => {
  const existing = await Shift.findOne({ employeeId, status: 'OPEN' });
  if (existing) throw new Error('Employee already has an open shift');

  return Shift.create({
    employeeId,
    openingCash,
    shiftDate: new Date(),
    scheduleId,
    scheduleSource,
    scheduledStart,
    scheduledEnd,
    scheduledDate,
  });
};

/**
 * Close (clock-out) a shift.
 * Computes earlyClockOut automatically.
 * Throws if attempting early clock-out without a reason.
 */
const closeShift = async (employeeId, { closingCash = 0, clockOutReason = null } = {}) => {
  const shift = await Shift.findOne({ employeeId, status: 'OPEN' });
  if (!shift) throw new Error('No open shift found for this employee');

  const now = new Date();
  let earlyClockOut = false;

  if (shift.scheduledEnd) {
    const [h, m] = shift.scheduledEnd.split(':').map(Number);
    const base = new Date(shift.clockInTime);
    const scheduledEndTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    // If scheduledEnd <= clockIn time (overnight shift), the end is on the next calendar day
    if (scheduledEndTime <= base) scheduledEndTime.setDate(scheduledEndTime.getDate() + 1);
    // More than 10 minutes before scheduled end = early
    earlyClockOut = now.getTime() < scheduledEndTime.getTime() - 10 * 60 * 1000;
  }

  if (earlyClockOut && !clockOutReason?.trim()) {
    const err = new Error('A reason is required for early clock-out.');
    err.code = 'EARLY_CLOCKOUT_REASON_REQUIRED';
    throw err;
  }

  shift.status         = 'CLOSED';
  shift.clockOutTime   = now;
  shift.closingCash    = closingCash;
  shift.clockOutReason = clockOutReason?.trim() || null;
  shift.earlyClockOut  = earlyClockOut;
  await shift.save();
  return shift;
};

const getActiveShift = async (employeeId) =>
  Shift.findOne({ employeeId, status: 'OPEN' });

/**
 * Recover a stale (forgotten) clock-out.
 * Called when an employee forgot to clock out on a previous day.
 * clockOutTime must be an ISO string — it is trusted as the corrected time.
 * earlyClockOut is forced false (the shift window has long passed).
 */
const recoverClockOut = async (employeeId, { clockOutTime, clockOutReason = null } = {}) => {
  const shift = await Shift.findOne({ employeeId, status: 'OPEN' });
  if (!shift) throw new Error('No open shift found for this employee.');

  const correctedTime = clockOutTime ? new Date(clockOutTime) : new Date();
  if (isNaN(correctedTime.getTime())) throw new Error('Invalid clockOutTime provided.');

  // Sanity: corrected time must be after clock-in
  if (correctedTime <= shift.clockInTime) {
    throw new Error('Clock-out time must be after clock-in time.');
  }
  // Sanity: corrected time must not be in the future
  if (correctedTime > new Date()) {
    throw new Error('Clock-out time cannot be in the future.');
  }

  shift.status         = 'CLOSED';
  shift.clockOutTime   = correctedTime;
  shift.closingCash    = 0;
  shift.earlyClockOut  = false; // shift ended long ago — not "early"
  shift.clockOutReason = clockOutReason?.trim()
    ? clockOutReason.trim()
    : 'Missed clock-out — recovered by employee';
  await shift.save();
  return shift;
};

/**
 * Manager-initiated forced checkout for a shift the employee left open past
 * its scheduled end (missed checkout). Targets a specific shift by _id
 * (the manager acts on a shift picked from the Missed Checkouts list), not
 * by employeeId — unlike closeShift/recoverClockOut which are self-service.
 *
 * checkoutTime defaults to the shift's own computed scheduled end if omitted.
 * Re-verifies status:'OPEN' at read time to guard against the shift having
 * just been closed (by the employee themselves, or another manager) in the
 * moments before this call — surfaces a clear error rather than silently
 * double-writing over a shift that's no longer open.
 */
const forceCheckout = async (shiftId, managerId, { reason, checkoutTime } = {}) => {
  const shift = await Shift.findOne({ _id: shiftId, status: 'OPEN' });
  if (!shift) throw new Error('Shift not found or already closed.');

  const closeTime = checkoutTime ? new Date(checkoutTime) : computeScheduledEndDate(shift);
  if (isNaN(closeTime.getTime())) throw new Error('Invalid checkout time.');
  if (closeTime <= shift.clockInTime) throw new Error('Checkout time must be after clock-in time.');
  if (closeTime > new Date()) throw new Error('Checkout time cannot be in the future.');

  const before = shift.toObject();

  shift.status           = 'CLOSED';
  shift.clockOutTime     = closeTime;
  shift.clockOutReason   = reason?.trim() || 'Force checked out by manager';
  shift.earlyClockOut    = false;
  shift.forcedCheckout   = true;
  shift.forcedCheckoutBy = managerId;
  await shift.save();

  return { shift, before };
};

export { openShift, closeShift, getActiveShift, recoverClockOut, forceCheckout };
