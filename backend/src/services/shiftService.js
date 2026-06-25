import Shift from '../models/Shift.js';

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
    const scheduledEndTime = new Date();
    scheduledEndTime.setHours(h, m, 0, 0);
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

export { openShift, closeShift, getActiveShift };
