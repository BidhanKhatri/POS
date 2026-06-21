import express from 'express';
const router = express.Router();

import authRoutes from './authRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import productRoutes from './productRoutes.js';
import saleRoutes from './saleRoutes.js';
import overrideRoutes from './overrideRoutes.js';
import reportRoutes from './reportRoutes.js';
import webauthnRoutes from './webauthnRoutes.js';
import settingRoutes from './settingRoutes.js';
import customerRoutes from './customerRoutes.js';

router.use('/auth', authRoutes);
router.use('/auth/webauthn', webauthnRoutes);
router.use('/shifts', shiftRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/overrides', overrideRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);
router.use('/customers', customerRoutes);

export default router;
