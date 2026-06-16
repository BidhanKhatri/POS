import * as saleService from '../services/saleService.js';
import * as shiftService from '../services/shiftService.js';

const processSale = async (req, res, next) => {
  try {
    const { items, payments, discountTotal } = req.body;

    // Shift is optional for now — sales are allowed without an open shift.
    const shift = await shiftService.getActiveShift(req.user._id);

    const sale = await saleService.processSale(
      req.user._id,
      shift ? shift._id : null,
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

const searchSales = async (req, res, next) => {
  try {
    const { invoiceNo, buyerPhone, productName, amount } = req.query;
    if (!invoiceNo && !buyerPhone && !productName && !amount) {
      res.status(400);
      throw new Error('Provide an invoice number, buyer phone, product, or amount to search');
    }
    const sales = await saleService.searchSales(req.user._id, { invoiceNo, buyerPhone, productName, amount });
    res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
};

const getSaleDetail = async (req, res, next) => {
  try {
    const detail = await saleService.getSaleDetail(req.params.id);
    res.status(200).json(detail);
  } catch (error) {
    res.status(404);
    next(error);
  }
};

export { processSale, searchSales, getSaleDetail, };
