import PosSchedule from '../models/PosSchedule.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';

// ─── pure-JS date helpers (no date-fns dependency) ─────────────────────────

function parseYMD(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function scheduledHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  return +(mins / 60).toFixed(2);
}

function toApiShape(doc) {
  const emp = doc.employeeId;
  return {
    scheduleId: doc._id,
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    title: doc.title,
    color: doc.color,
    scheduledHours: scheduledHours(doc.startTime, doc.endTime),
    employee: emp
      ? { _id: emp._id, name: emp.name, email: emp.email }
      : null,
  };
}

// ─── guards ────────────────────────────────────────────────────────────────

async function isSyncOn() {
  const doc = await Setting.findById('global').lean();
  return doc?.syncStaffingBetit === true;
}

// ─── controllers ───────────────────────────────────────────────────────────

/**
 * GET /api/schedules
 * Query: employeeId, startDate, endDate
 * Access: Manager, Admin
 */
export const listSchedules = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (startDate)       filter.date = { $gte: startDate };
    else if (endDate)         filter.date = { $lte: endDate };

    const docs = await PosSchedule.find(filter)
      .populate('employeeId', 'name email employeeCode')
      .sort({ date: 1, startTime: 1 })
      .lean();

    const data = docs.map(toApiShape);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schedules
 * Body: { employeeId, date, startTime, endTime, title?, color? }
 * Access: Manager, Admin
 */
export const createSchedule = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({
        message: 'Sync Staffing Betit is enabled — schedules are managed by EMS.',
      });
    }

    const { employeeId, date, startTime, endTime, title, color } = req.body;

    if (!employeeId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'employeeId, date, startTime, and endTime are required.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date must be YYYY-MM-DD.' });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ message: 'startTime and endTime must be HH:mm.' });
    }
    if (startTime === endTime) {
      return res.status(400).json({ message: 'startTime and endTime cannot be the same.' });
    }

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const doc = await PosSchedule.create({
      employeeId,
      date,
      startTime,
      endTime,
      title: title?.trim() || 'Regular Shift',
      color: color || '#3E2723',
      createdBy: req.user._id,
    });

    const populated = await PosSchedule.findById(doc._id)
      .populate('employeeId', 'name email employeeCode')
      .lean();

    res.status(201).json({ success: true, data: toApiShape(populated) });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/schedules/:id
 * Body: { date?, startTime?, endTime?, title?, color? }
 * Access: Manager, Admin
 */
export const updateSchedule = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({
        message: 'Sync Staffing Betit is enabled — schedules are managed by EMS.',
      });
    }

    const existing = await PosSchedule.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Schedule not found.' });

    const { date, startTime, endTime, title, color } = req.body;

    const newStart = startTime ?? existing.startTime;
    const newEnd   = endTime   ?? existing.endTime;
    if (newStart === newEnd) {
      return res.status(400).json({ message: 'startTime and endTime cannot be the same.' });
    }

    const updates = {};
    if (date)      updates.date      = date;
    if (startTime) updates.startTime = startTime;
    if (endTime)   updates.endTime   = endTime;
    if (title !== undefined) updates.title = title?.trim() || 'Regular Shift';
    if (color)     updates.color     = color;

    const updated = await PosSchedule.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email employeeCode').lean();

    res.json({ success: true, data: toApiShape(updated) });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/schedules/:id
 * Access: Manager, Admin
 */
export const deleteSchedule = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({
        message: 'Sync Staffing Betit is enabled — schedules are managed by EMS.',
      });
    }

    const doc = await PosSchedule.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Schedule not found.' });

    res.json({ success: true, message: 'Schedule deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schedules/copy-week
 * Body: { sourceDate, employeeId? }
 * Copies all schedules on sourceDate to every other day in the same Sun–Sat week.
 * Access: Manager, Admin
 */
export const copyWeekSchedule = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({ message: 'Sync is enabled — schedules managed by EMS.' });
    }

    const { sourceDate, employeeId } = req.body;
    if (!sourceDate) return res.status(400).json({ message: 'sourceDate is required.' });

    const sourceFilter = { date: sourceDate };
    if (employeeId) sourceFilter.employeeId = employeeId;

    const sourceSchedules = await PosSchedule.find(sourceFilter).lean();
    if (sourceSchedules.length === 0) {
      return res.status(404).json({ message: 'No schedules found on the source date.' });
    }

    const parsedSource = parseYMD(sourceDate);
    const dayOfWeek = parsedSource.getDay(); // 0=Sun
    const sunday = addDays(parsedSource, -dayOfWeek);

    const toInsert = [];

    for (let i = 0; i < 7; i++) {
      const targetDate = addDays(sunday, i);
      const targetYMD  = toYMD(targetDate);
      if (targetYMD === sourceDate) continue;

      const deleteFilter = { date: targetYMD };
      if (employeeId) deleteFilter.employeeId = employeeId;
      await PosSchedule.deleteMany(deleteFilter);

      for (const s of sourceSchedules) {
        toInsert.push({
          employeeId: s.employeeId,
          date: targetYMD,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title,
          color: s.color,
          createdBy: req.user._id,
        });
      }
    }

    if (toInsert.length > 0) await PosSchedule.insertMany(toInsert);

    res.json({
      success: true,
      message: `Copied ${sourceSchedules.length} shift(s) from ${sourceDate} to the rest of the week.`,
      inserted: toInsert.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schedules/bulk-copy
 * Body: { sourceStartDate, employeeId?, weeksCount }
 * Copies source week's schedules into the next weeksCount weeks.
 * Access: Manager, Admin
 */
export const bulkCopySchedules = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({ message: 'Sync is enabled — schedules managed by EMS.' });
    }

    const { sourceStartDate, employeeId, weeksCount } = req.body;
    if (!sourceStartDate || !weeksCount) {
      return res.status(400).json({ message: 'sourceStartDate and weeksCount are required.' });
    }

    const weeks = Math.min(Math.max(Number(weeksCount), 1), 52);
    const sourceEndDate = toYMD(addDays(parseYMD(sourceStartDate), 6));

    const filter = { date: { $gte: sourceStartDate, $lte: sourceEndDate } };
    if (employeeId) filter.employeeId = employeeId;

    const sourceSchedules = await PosSchedule.find(filter).lean();
    if (sourceSchedules.length === 0) {
      return res.status(404).json({ message: 'No schedules found in the source week.' });
    }

    const sourceStart = parseYMD(sourceStartDate);
    const toInsert = [];

    for (let w = 1; w <= weeks; w++) {
      const weekOffset = w * 7;

      for (const s of sourceSchedules) {
        const originalDate = parseYMD(s.date);
        const dayOffset = Math.round((originalDate - sourceStart) / (1000 * 60 * 60 * 24));
        const targetDate = toYMD(addDays(sourceStart, weekOffset + dayOffset));

        await PosSchedule.deleteMany({ date: targetDate, employeeId: s.employeeId });

        toInsert.push({
          employeeId: s.employeeId,
          date: targetDate,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title,
          color: s.color,
          createdBy: req.user._id,
        });
      }
    }

    if (toInsert.length > 0) await PosSchedule.insertMany(toInsert);

    res.json({
      success: true,
      message: `Schedule replicated for ${weeks} week(s).`,
      inserted: toInsert.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schedules/batch
 * Body: { employeeId, weekStart, days: [{ dayIndex, enabled, startTime, endTime, title, color }], repeatPeriod }
 * repeatPeriod: '1week' | '1month' | '6months' | '1year'
 * Creates (or replaces) shifts for an entire week pattern, optionally repeated forward.
 * Access: Manager, Admin
 */
export const batchCreateSchedules = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({ message: 'Sync is enabled — schedules managed by EMS.' });
    }

    const { employeeId, weekStart, days, repeatPeriod = '1week' } = req.body;

    if (!employeeId || !weekStart || !Array.isArray(days)) {
      return res.status(400).json({ message: 'employeeId, weekStart, and days array are required.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return res.status(400).json({ message: 'weekStart must be YYYY-MM-DD.' });
    }

    const employee = await User.findById(employeeId).lean();
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    // total weeks to fill (includes the source week itself)
    const periodWeeks = { '1week': 1, '1month': 4, '6months': 26, '1year': 52 };
    const totalWeeks = periodWeeks[repeatPeriod] ?? 1;

    const weekStartDate = parseYMD(weekStart);
    const toCreate   = [];
    const datesToDel = new Set();

    for (let w = 0; w < totalWeeks; w++) {
      for (const day of days) {
        if (!day?.enabled) continue;
        const { dayIndex, startTime, endTime, title, color } = day;
        if (!startTime || !endTime || startTime === endTime) continue;

        const date = toYMD(addDays(weekStartDate, w * 7 + Number(dayIndex)));
        datesToDel.add(date);
        toCreate.push({
          employeeId,
          date,
          startTime,
          endTime,
          title: title?.trim() || 'Regular Shift',
          color: color || '#3E2723',
          createdBy: req.user._id,
        });
      }
    }

    // Replace existing shifts on affected dates
    if (datesToDel.size > 0) {
      await PosSchedule.deleteMany({ employeeId, date: { $in: [...datesToDel] } });
    }

    const created = toCreate.length > 0 ? await PosSchedule.insertMany(toCreate) : [];

    res.status(201).json({
      success: true,
      message: `Created ${created.length} shift(s) across ${totalWeeks} week(s).`,
      count: created.length,
      weeks: totalWeeks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schedules/bulk-delete
 * Body: { startDate, endDate, employeeId? }
 * Access: Manager, Admin
 */
export const deleteSchedulesInRange = async (req, res, next) => {
  try {
    if (await isSyncOn()) {
      return res.status(409).json({ message: 'Sync is enabled — schedules managed by EMS.' });
    }

    const { startDate, endDate, employeeId } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required.' });
    }

    const filter = { date: { $gte: startDate, $lte: endDate } };
    if (employeeId && employeeId !== 'all') filter.employeeId = employeeId;

    const result = await PosSchedule.deleteMany(filter);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} schedule(s).`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
