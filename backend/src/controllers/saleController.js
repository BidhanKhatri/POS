import * as saleService from '../services/saleService.js';
import * as shiftService from '../services/shiftService.js';

const processSale = async (req, res, next) => {
  try {
    const { items, payments, discountTotal } = req.body;

    // Validate shift
    const shift = await shiftService.getActiveShift(req.user._id);
    if (!shift) {
      res.status(400);
      throw new Error('You must have an open shift to process a sale');
    }

    const sale = await saleService.processSale(
      req.user._id,
      shift._id,
      items,
      payments,
      discountTotal || 0
    );

    res.status(201).json(sale);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

export { processSale, };
