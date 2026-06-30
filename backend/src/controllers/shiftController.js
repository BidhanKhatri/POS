import * as shiftService from '../services/shiftService.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';

const clockIn = async (req, res, next) => {
  try {
    const {
      openingCash,
      scheduleId, scheduleSource,
      scheduledStart, scheduledEnd, scheduledDate,
    } = req.body;

    const shift = await shiftService.openShift(req.user._id, {
      openingCash:    openingCash    ?? 0,
      scheduleId:     scheduleId     ?? null,
      scheduleSource: scheduleSource ?? 'MANUAL',
      scheduledStart: scheduledStart ?? null,
      scheduledEnd:   scheduledEnd   ?? null,
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

export { clockIn, clockOut, getMyActiveShift, recoverClockOut };
