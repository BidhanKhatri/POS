import * as staffingService from '../services/staffingService.js';

/**
 * GET /api/staffing/groups
 * Access: Manager, Admin
 *
 * Returns all EMS groups with their member lists for read-only display
 * in the Manager Groups page.
 */
export const getEmsGroups = async (req, res, next) => {
  try {
    const groups = await staffingService.fetchGroups();
    res.status(200).json({ success: true, count: groups.length, data: groups });
  } catch (error) {
    if (error.message?.includes('EMS API error')) {
      return res.status(502).json({ success: false, message: 'EMS service unavailable. Check that the staffing portal is running.' });
    }
    next(error);
  }
};

/**
 * GET /api/staffing/shifts/current
 * Access: Employee, Manager, Admin
 *
 * Returns the authenticated user's scheduled shift for today from EMS.
 * Mapping: POS User.staffingBetitEmployeeId → EMS employeeId
 *          Fallback: POS User.email → EMS employee.email
 */
export const getCurrentShift = async (req, res, next) => {
  try {
    const { staffingBetitEmployeeId, email } = req.user;

    if (!staffingBetitEmployeeId && !email) {
      return res.status(200).json({
        success: true,
        linked: false,
        message: 'No EMS employee link configured for this user.',
        data: null,
      });
    }

    const shifts = await staffingService.fetchCurrentShift({
      staffingBetitEmployeeId,
      email,
    });

    if (!shifts || shifts.length === 0) {
      return res.status(200).json({
        success: true,
        linked: true,
        scheduled: false,
        message: 'No shift scheduled for today.',
        data: null,
      });
    }

    // Map EMS schedule fields to a clean POS-facing shape
    const shift = shifts[0]; // typically one shift per day
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    let scheduledMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (scheduledMinutes < 0) scheduledMinutes += 24 * 60; // overnight shift

    res.status(200).json({
      success: true,
      linked: true,
      scheduled: true,
      data: {
        scheduleId: shift._id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        title: shift.title,
        color: shift.color,
        scheduledHours: +(scheduledMinutes / 60).toFixed(2),
        employee: shift.employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staffing/shifts
 * Access: Manager, Admin
 *
 * Returns all employee schedules from EMS for a given date range.
 *
 * Query params:
 *   employeeId  – EMS employee ObjectId (optional filter)
 *   startDate   – YYYY-MM-DD (optional)
 *   endDate     – YYYY-MM-DD (optional)
 *   status      – "today" shorthand; sets startDate = endDate = today
 */
export const getAllSchedules = async (req, res, next) => {
  try {
    let { employeeId, startDate, endDate, status } = req.query;

    // Convenience: ?status=today
    if (status === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      startDate = today;
      endDate = today;
    }

    const schedules = await staffingService.fetchSchedules({
      employeeId,
      startDate,
      endDate,
    });

    // Enrich each schedule with computed hours
    const data = (schedules ?? []).map((s) => {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      let scheduledMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (scheduledMinutes < 0) scheduledMinutes += 24 * 60; // overnight shift
      return {
        scheduleId: s._id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        color: s.color,
        scheduledHours: +(scheduledMinutes / 60).toFixed(2),
        employee: s.employee,
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};
