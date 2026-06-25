import * as shiftService from '../services/shiftService.js';

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

export { clockIn, clockOut, getMyActiveShift };
