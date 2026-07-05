import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import { list, search, analytics, detail, purchases, refunds, update, remove, uploadCustomerImage, deleteCustomerImage } from '../controllers/customerController.js';
import { imageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Named routes before /:id to avoid param capture
router.get('/search',    protect,                search);
router.get('/analytics', protect, managerOrAdmin, analytics);
router.get('/',          protect,                list);

// Sub-resource routes
router.get('/:id/purchases', protect, purchases);
router.get('/:id/refunds',   protect, refunds);
router.get('/:id',           protect, detail);

// Write operations — manager / admin only
router.put('/:id',    protect, managerOrAdmin, update);
router.delete('/:id', protect, managerOrAdmin, remove);

// Image operations
router.patch('/:id/image',  protect, managerOrAdmin, imageUpload('image'), uploadCustomerImage);
router.delete('/:id/image', protect, managerOrAdmin, deleteCustomerImage);

export default router;
