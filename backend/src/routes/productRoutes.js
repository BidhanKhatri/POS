import express from 'express';
const router = express.Router();
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getProductMovements,
  uploadProductImage,
  deleteProductImage,
  addProductImageToArray,
  removeProductImageFromArray,
} from '../controllers/productController.js';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import { imageUpload } from '../middleware/uploadMiddleware.js';

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

router.patch('/:id/image',              protect, managerOrAdmin, imageUpload('image'), uploadProductImage);
router.delete('/:id/image',             protect, managerOrAdmin, deleteProductImage);
router.post('/:id/images',              protect, managerOrAdmin, imageUpload('image'), addProductImageToArray);
router.delete('/:id/images/:fileId',    protect, managerOrAdmin, removeProductImageFromArray);

export default router;
