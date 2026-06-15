import express from 'express';
const router = express.Router();
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getProductMovements,
} from '../controllers/productController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';

router.route('/')
  .get(protect, getProducts)
  .post(protect, managerOrAdmin, createProduct);

router.route('/:id')
  .put(protect, managerOrAdmin, updateProduct)
  .delete(protect, managerOrAdmin, deleteProduct);

router.route('/:id/stock')
  .post(protect, managerOrAdmin, addStockMovement);

router.route('/:id/movements')
  .get(protect, managerOrAdmin, getProductMovements);

export default router;
