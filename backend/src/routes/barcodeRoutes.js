import express from 'express';
import {
  generateBarcode,
  getBarcodes,
  getProductsWithBarcodeStatus,
  scanBarcode,
  getBarcodeById,
  regenerateBarcode,
  trackPrint,
} from '../controllers/barcodeController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Any authenticated user can scan (employees need this for the scanner page)
router.get('/scan/:value', protect, scanBarcode);

// Manager/Admin: product list with barcode status
router.get('/products', protect, managerOrAdmin, getProductsWithBarcodeStatus);

// Manager/Admin: list all barcodes + generate
router.route('/')
  .get(protect, managerOrAdmin, getBarcodes)
  .post(protect, managerOrAdmin, generateBarcode);

// Manager/Admin: single barcode operations
router.get('/:id', protect, managerOrAdmin, getBarcodeById);
router.put('/:id/regenerate', protect, managerOrAdmin, regenerateBarcode);
router.post('/:id/print', protect, managerOrAdmin, trackPrint);

export default router;
