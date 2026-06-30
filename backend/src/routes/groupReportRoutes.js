import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import {
  syncGroups,
  getGroupsSummary,
  getLeaderboard,
  getGroupDetail,
  getGroupTrend,
  exportGroups,
} from '../controllers/groupReportController.js';

const router = express.Router();

router.use(protect, managerOrAdmin);

router.post('/sync',               syncGroups);
router.get('/export',              exportGroups);      // before /:groupId
router.get('/leaderboard',         getLeaderboard);
router.get('/',                    getGroupsSummary);
router.get('/:groupId/trend',      getGroupTrend);
router.get('/:groupId',            getGroupDetail);

export default router;
