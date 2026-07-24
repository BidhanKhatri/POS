import * as shiftService from '../services/shiftService.js';
import Shift from '../models/Shift.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';
import { computeScheduledEndDate } from '../utils/shiftTime.js';

const clockIn = async (req, res, next) => {
  try {
    const {
      openingCash,
      scheduleId, scheduleSource,
      scheduledStart, scheduledEnd, scheduledStartUtc, scheduledEndUtc, scheduledDate,
    } = req.body;

    const shift = await shiftService.openShift(req.user._id, {
      openingCash:    openingCash    ?? 0,
      scheduleId:     scheduleId     ?? null,
      scheduleSource: scheduleSource ?? 'MANUAL',
      scheduledStart: scheduledStart ?? null,
      scheduledEnd:   scheduledEnd   ?? null,
      scheduledStartUtc: scheduledStartUtc ?? null,
      scheduledEndUtc:scheduledEndUtc?? null,
      scheduledDate:  scheduledDate  ?? null,
    });

    res.status(201).json({ success: true, data: shift });
    emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, {
      action: 'CLOCK_IN',
      employee: { id: req.user._id, name: req.user.name },
      shiftId: shift._id,
      clockIn: shift.clockIn,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const { closingCash, clockOutReason } = req.body;

    const shift = await shiftService.closeShift(req.user._id, {
      closingCash:    closingCash    ?? 0,
      clockOutReason: clockOutReason ?? null,
    });

    res.status(200).json({ success: true, data: shift });
    emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, {
      action: 'CLOCK_OUT',
      employee: { id: req.user._id, name: req.user.name },
      shiftId: shift._id,
      clockOut: shift.clockOut,
    });
  } catch (error) {
    if (error.code === 'EARLY_CLOCKOUT_REASON_REQUIRED') {
      return res.status(422).json({
        success: false,
        code: 'EARLY_CLOCKOUT_REASON_REQUIRED',
        message: error.message,
      });
    }
    res.status(400);
    next(error);
  }
};

const getMyActiveShift = async (req, res, next) => {
  try {
    const shift = await shiftService.getActiveShift(req.user._id);
    res.status(200).json({ success: true, data: shift ?? null });
  } catch (error) {
    next(error);
  }
};

const recoverClockOut = async (req, res, next) => {
  try {
    const { clockOutTime, clockOutReason } = req.body;
    if (!clockOutTime) {
      return res.status(400).json({ success: false, message: 'clockOutTime is required.' });
    }

    const shift = await shiftService.recoverClockOut(req.user._id, {
      clockOutTime,
      clockOutReason: clockOutReason ?? null,
    });

    res.status(200).json({ success: true, data: shift });
    emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, {
      action: 'CLOCK_OUT_RECOVERED',
      employee: { id: req.user._id, name: req.user.name },
      shiftId: shift._id,
      clockOutTime: shift.clockOutTime,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

/**
 * Manager/Admin only — full list of currently active (OPEN) shifts, excluding
 * ones already flagged as a missed checkout (those live in getMissedCheckouts
 * instead). Used by the Scheduling page's "Active Shifts" section — same
 * shape as the dashboard's activeShifts, but unpaginated (full list, not
 * capped at 10).
 */
const getActiveShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({ status: 'OPEN', missedCheckoutDetectedAt: null })
      .populate('employeeId', 'name role employeeCode')
      .sort({ clockInTime: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: shifts.map((s) => ({
        _id:         s._id,
        clockInTime: s.clockInTime,
        totalSales:  s.totalSales,
        totalTxn:    s.totalTransactions,
        employee:    s.employeeId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manager/Admin only — list shifts flagged by the missed-checkout cron
 * (still OPEN, past their scheduled end). Enriches each with the employee's
 * most recent Sale during this shift as "last activity" (real data only —
 * falls back to clockInTime if the employee never rang up a sale).
 */
const getMissedCheckouts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({ status: 'OPEN', missedCheckoutDetectedAt: { $ne: null } })
      .populate('employeeId', 'name role employeeCode')
      .sort({ missedCheckoutDetectedAt: 1 })
      .lean();

    const enriched = await Promise.all(shifts.map(async (shift) => {
      const scheduledEndDate = computeScheduledEndDate(shift);
      const lastSale = await Sale.findOne({ employeeId: shift.employeeId?._id, createdAt: { $gte: shift.clockInTime } })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();
      const overtimeMinutes = Math.max(0, Math.round((Date.now() - scheduledEndDate.getTime()) / 60000));

      return {
        _id:            shift._id,
        employee:       shift.employeeId,
        clockInTime:    shift.clockInTime,
        scheduledEnd:   scheduledEndDate,
        overtimeMinutes,
        lastActivity:   lastSale?.createdAt ?? shift.clockInTime,
      };
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * Manager/Admin only — force-close a missed-checkout shift on the employee's
 * behalf. PIN-verified the same way override approval is. Audit-logs the
 * action and pushes real-time updates to the employee (instant lock) and to
 * every manager dashboard.
 */
const forceCheckout = async (req, res, next) => {
  try {
    const { pin, reason, checkoutTime } = req.body;

    const manager = await User.findById(req.user._id).select('+pinHash');
    if (!manager || !(await manager.matchPin(pin))) {
      return res.status(401).json({ success: false, message: 'Invalid manager PIN' });
    }

    const { shift, before } = await shiftService.forceCheckout(req.params.id, req.user._id, { reason, checkoutTime });

    await AuditLog.create({
      action: 'FORCED_CHECKOUT',
      entity: 'Shift',
      entityId: shift._id,
      beforeData: before,
      afterData: shift.toObject(),
      performedBy: req.user._id,
      role: req.user.role,
    });

    res.status(200).json({ success: true, data: shift });

    emit(ROOMS.employee(shift.employeeId.toString()), EVENTS.FORCE_CHECKOUT, {
      shiftId: shift._id,
      clockOutTime: shift.clockOutTime,
      reason: shift.clockOutReason,
    });
    emit(ROOMS.MANAGERS, EVENTS.SHIFT_UPDATE, { action: 'FORCE_CHECKOUT', shiftId: shift._id });
    emit(ROOMS.MANAGERS, EVENTS.MISSED_CHECKOUT_DETECTED, { shiftId: shift._id, resolved: true });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

export { clockIn, clockOut, getMyActiveShift, recoverClockOut, getActiveShifts, getMissedCheckouts, forceCheckout };
