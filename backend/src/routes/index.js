import express from 'express';
const router = express.Router();

import authRoutes from './authRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import productRoutes from './productRoutes.js';
import saleRoutes from './saleRoutes.js';
import overrideRoutes from './overrideRoutes.js';

router.use('/auth', authRoutes);
router.use('/shifts', shiftRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/overrides', overrideRoutes);

export default router;
