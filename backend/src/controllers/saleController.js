import * as saleService from '../services/saleService.js';
import * as shiftService from '../services/shiftService.js';
import { sendReceiptEmail } from '../services/emailService.js';
import Sale from '../models/Sale.js';
import { emit } from '../socket/emitter.js';
import { EVENTS, ROOMS } from '../socket/events.js';

const processSale = async (req, res, next) => {
  try {
    const { items, payments, discountTotal, discountOverrideId } = req.body;

    // Shift is optional for now — sales are allowed without an open shift.
    const shift = await shiftService.getActiveShift(req.user._id);

    const sale = await saleService.processSale(
      req.user._id,
      shift ? shift._id : null,
      items,
      payments,
      discountTotal || 0,
      discountOverrideId || null
    );

    res.status(201).json(sale);
    emit(ROOMS.MANAGERS, EVENTS.TRANSACTION_NEW, {
      saleId:    sale._id,
      invoiceNo: sale.invoiceNo,
      grandTotal: sale.grandTotal,
      employee:  { id: req.user._id, name: req.user.name },
      createdAt: sale.createdAt,
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const searchSales = async (req, res, next) => {
  try {
    const { invoiceNo, cardLast4, productName, amount } = req.query;
    if (!invoiceNo && !cardLast4 && !productName && !amount) {
      res.status(400);
      throw new Error('Provide an invoice number or card last 4 digits to search');
    }
    const sales = await saleService.searchSales(req.user._id, { invoiceNo, cardLast4, productName, amount });
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

const listTransactions = async (req, res, next) => {
  try {
    const { page, limit, search, method, status, startDate, endDate, employeeId } = req.query;
    const result = await saleService.listTransactions(req.user, {
      page:       Math.max(1, parseInt(page) || 1),
      limit:      Math.min(50, Math.max(1, parseInt(limit) || 20)),
      search:     search || '',
      method:     method || '',
      status:     status || '',
      startDate:  startDate || '',
      endDate:    endDate || '',
      employeeId: employeeId || '',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const emailReceipt = async (req, res, next) => {
  try {
    const { invoiceNo } = req.params;
    const { email, sale: clientSale } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400);
      throw new Error('A valid email address is required.');
    }

    // Prefer DB record; fall back to client-supplied data for fields we don't store
    const dbSale = await Sale.findOne({ invoiceNo });
    const sale = dbSale
      ? {
          invoiceNo: dbSale.invoiceNo,
          createdAt: dbSale.createdAt,
          grandTotal: dbSale.grandTotal,
          method: dbSale.payments?.[0]?.method,
          card: dbSale.payments?.[0]?.card || null,
          buyer: dbSale.payments?.[0]?.buyer || clientSale?.buyer,
          product: clientSale?.product,
          transactionType: clientSale?.transactionType,
        }
      : clientSale;

    if (!sale) {
      res.status(404);
      throw new Error('Sale not found.');
    }

    await sendReceiptEmail({ to: email, sale });
    res.json({ message: `Receipt sent to ${email}` });
  } catch (error) {
    next(error);
  }
};

const completeSale = async (req, res, next) => {
  try {
    const { id: saleId } = req.params;
    const shift = await shiftService.getActiveShift(req.user._id);
    const sale = await saleService.completeSale(
      req.user._id,
      saleId,
      shift ? shift._id : null,
    );
    res.status(200).json(sale);
  } catch (error) {
    res.status(400);
    next(error);
  }
};

const managerSaleDetail = async (req, res, next) => {
  try {
    const detail = await saleService.getSaleDetailManager(req.params.id, req.user);
    res.status(200).json(detail);
  } catch (error) {
    res.status(error.message === 'Sale not found' ? 404 : 403);
    next(error);
  }
};

const transactionKpis = async (req, res, next) => {
  try {
    const { method, status, startDate, endDate, employeeId } = req.query;
    const result = await saleService.getTransactionKpis(req.user, {
      method:     method     || '',
      status:     status     || '',
      startDate:  startDate  || '',
      endDate:    endDate    || '',
      employeeId: employeeId || '',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const listEmployees = async (req, res, next) => {
  try {
    const employees = await saleService.listEmployees();
    res.json(employees);
  } catch (error) {
    next(error);
  }
};

export { processSale, completeSale, searchSales, getSaleDetail, listTransactions, emailReceipt, managerSaleDetail, transactionKpis, listEmployees };
