import * as staffingService from '../services/staffingService.js';
import Setting from '../models/Setting.js';
import PosSchedule from '../models/PosSchedule.js';

/**
 * GET /api/staffing/my-schedule
 * Access: Any authenticated user (employee, manager, admin)
 *
 * Returns the authenticated user's scheduled shifts for a 7-day window.
 * If syncStaffingBetit is ON  → pulls from EMS (Staffing Betit).
 * If syncStaffingBetit is OFF → pulls from POS local PosSchedule collection.
 *
 * Query: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * If omitted, defaults to the current Mon–Sun week.
 */
export const getMySchedule = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;

    // Default to current Mon–Sun week
    if (!startDate || !endDate) {
      const today = new Date();
      const dow   = today.getDay(); // 0=Sun
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d) => d.toISOString().slice(0, 10);
      startDate = fmt(monday);
      endDate   = fmt(sunday);
    }

    const setting = await Setting.findById('global').lean();
    const synced  = setting?.syncStaffingBetit === true;

    let data = [];

    if (synced) {
      const { staffingBetitEmployeeId, email } = req.user;

      if (!staffingBetitEmployeeId && !email) {
        return res.json({ success: true, synced: true, linked: false, startDate, endDate, data: [] });
      }

      const raw = await staffingService.fetchMySchedule({
        staffingBetitEmployeeId,
        email,
        startDate,
        endDate,
      });

      data = (raw ?? []).map((s) => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        return {
          scheduleId: String(s._id),
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title ?? 'Shift',
          color: s.color ?? '#3E2723',
          scheduledHours: +(mins / 60).toFixed(2),
        };
      });
    } else {
      const docs = await PosSchedule.find({
        employeeId: req.user._id,
        date: { $gte: startDate, $lte: endDate },
      })
        .sort({ date: 1, startTime: 1 })
        .lean();

      data = docs.map((doc) => {
        const [sh, sm] = doc.startTime.split(':').map(Number);
        const [eh, em] = doc.endTime.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        return {
          scheduleId: String(doc._id),
          date: doc.date,
          startTime: doc.startTime,
          endTime: doc.endTime,
          title: doc.title,
          color: doc.color,
          scheduledHours: +(mins / 60).toFixed(2),
        };
      });
    }

    res.json({ success: true, synced, linked: true, startDate, endDate, data });
  } catch (err) {
    if (err.message?.includes('EMS API error')) {
      return res.status(502).json({ success: false, message: 'EMS service unavailable. Check that the staffing portal is running.' });
    }
    next(err);
  }
};

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
