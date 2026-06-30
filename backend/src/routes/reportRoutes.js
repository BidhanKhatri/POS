import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import {
  getSummary,
  getTrend,
  getPayments,
  getProducts,
  getCashiers,
  getRefunds,
  getHeatmap,
  getShiftGroups,
  getPosGroups,
  getAnomalies,
  getInsights,
  exportReport,
  getEmployeeDetail,
} from '../controllers/reportController.js';

const router = express.Router();

// All report routes require authentication + Manager or Admin role
router.use(protect, managerOrAdmin);

router.get('/summary',   getSummary);
router.get('/trend',     getTrend);
router.get('/payments',  getPayments);
router.get('/products',  getProducts);
router.get('/cashiers',  getCashiers);
router.get('/refunds',   getRefunds);
router.get('/heatmap',   getHeatmap);
router.get('/groups',    getShiftGroups);
router.get('/pos-groups', getPosGroups);
router.get('/anomalies', getAnomalies);
router.get('/insights',  getInsights);
router.get('/export',        exportReport);
router.get('/employee/:id',  getEmployeeDetail);

export default router;
