import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  copyWeekSchedule,
  bulkCopySchedules,
  deleteSchedulesInRange,
  batchCreateSchedules,
} from '../controllers/scheduleController.js';

const router = express.Router();
router.use(protect, managerOrAdmin);

// bulk operations must come before /:id to avoid Express treating 'copy-week' etc. as an id
router.post('/batch',       batchCreateSchedules);
router.post('/copy-week',   copyWeekSchedule);
router.post('/bulk-copy',   bulkCopySchedules);
router.post('/bulk-delete', deleteSchedulesInRange);

router.get('/',      listSchedules);
router.post('/',     createSchedule);
router.put('/:id',   updateSchedule);
router.delete('/:id', deleteSchedule);

export default router;
