import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import { getCurrentShift, getAllSchedules, getEmsGroups, getMySchedule } from '../controllers/staffingController.js';

const router = express.Router();

// Every staffing route requires a valid POS session
router.use(protect);

/**
 * GET /api/staffing/my-schedule
 * Any authenticated user — shows their own 7-day schedule (EMS or POS DB based on sync setting).
 */
router.get('/my-schedule', getMySchedule);

/**
 * GET /api/staffing/shifts/current
 * Any authenticated user — shows their own shift for today.
 */
router.get('/shifts/current', getCurrentShift);

/**
 * GET /api/staffing/shifts
 * Manager / Admin only — full schedule view with filters.
 */
router.get('/shifts', managerOrAdmin, getAllSchedules);

/**
 * GET /api/staffing/groups
 * Manager / Admin only — returns EMS groups with member lists.
 */
router.get('/groups', managerOrAdmin, getEmsGroups);

export default router;
