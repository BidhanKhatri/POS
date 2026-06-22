import express from 'express';
import { employeeDashboard } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/employee', protect, employeeDashboard);

export default router;
