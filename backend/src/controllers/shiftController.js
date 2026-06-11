import * as shiftService from '../services/shiftService.js';

const clockIn = async (req, res, next) => {
  try {
    const { openingCash } = req.body;
    const shift = await shiftService.openShift(req.user._id, openingCash || 0);
    res.status(201).json(shift);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const { closingCash } = req.body;
    const shift = await shiftService.closeShift(req.user._id, closingCash || 0);
    res.status(200).json(shift);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const getMyActiveShift = async (req, res, next) => {
  try {
    const shift = await shiftService.getActiveShift(req.user._id);
    res.status(200).json(shift);
  } catch (error) {
    next(error);
  }
};

export { clockIn,
  clockOut,
  getMyActiveShift, };
