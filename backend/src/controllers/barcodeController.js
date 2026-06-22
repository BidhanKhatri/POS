import * as barcodeService from '../services/barcodeService.js';

const generateBarcode = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    const barcode = await barcodeService.generateBarcode(
      productId,
      req.user._id,
      req.user.role,
      req.ip
    );
    res.status(201).json(barcode);
  } catch (error) {
    if (error.message.includes('already exists')) res.status(409);
    else res.status(400);
    next(error);
  }
};

const getBarcodes = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await barcodeService.getBarcodes({
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getProductsWithBarcodeStatus = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await barcodeService.getProductsWithBarcodeStatus({
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const scanBarcode = async (req, res, next) => {
  try {
    const { value } = req.params;
    const barcode = await barcodeService.getBarcodeByValue(decodeURIComponent(value));
    res.status(200).json(barcode);
  } catch (error) {
    res.status(404);
    next(error);
  }
};

const getBarcodeById = async (req, res, next) => {
  try {
    const barcode = await barcodeService.getBarcodeById(req.params.id);
    res.status(200).json(barcode);
  } catch (error) {
    res.status(404);
    next(error);
  }
};

const regenerateBarcode = async (req, res, next) => {
  try {
    const barcode = await barcodeService.regenerateBarcode(
      req.params.id,
      req.user._id,
      req.user.role,
      req.ip
    );
    res.status(200).json(barcode);
  } catch (error) {
    next(error);
  }
};

const trackPrint = async (req, res, next) => {
  try {
    const barcode = await barcodeService.trackPrint(
      req.params.id,
      req.user._id,
      req.user.role,
      req.ip
    );
    res.status(200).json(barcode);
  } catch (error) {
    next(error);
  }
};

export {
  generateBarcode,
  getBarcodes,
  getProductsWithBarcodeStatus,
  scanBarcode,
  getBarcodeById,
  regenerateBarcode,
  trackPrint,
};
