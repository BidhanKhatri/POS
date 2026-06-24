import express from 'express';
const router = express.Router();

import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import productRoutes from './productRoutes.js';
import saleRoutes from './saleRoutes.js';
import overrideRoutes from './overrideRoutes.js';
import reportRoutes from './reportRoutes.js';
import webauthnRoutes from './webauthnRoutes.js';
import settingRoutes from './settingRoutes.js';
import customerRoutes from './customerRoutes.js';
import barcodeRoutes from './barcodeRoutes.js';
import staffingRoutes from './staffingRoutes.js';
import accountRoutes from './accountRoutes.js';
import scheduleRoutes from './scheduleRoutes.js';

router.use('/auth', authRoutes);
router.use('/auth/webauthn', webauthnRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/shifts', shiftRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/overrides', overrideRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);
router.use('/customers', customerRoutes);
router.use('/barcodes', barcodeRoutes);
router.use('/staffing', staffingRoutes);
router.use('/accounts', accountRoutes);
router.use('/schedules', scheduleRoutes);

export default router;
