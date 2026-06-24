import * as groupSync   from '../services/groupSyncService.js';
import * as groupReport from '../services/groupReportService.js';

function parseDateRange(query) {
  const end   = query.end   ? new Date(query.end)   : new Date();
  const start = query.start ? new Date(query.start) : (() => {
    const d = new Date(end); d.setDate(d.getDate() - 30); return d;
  })();
  if (isNaN(start) || isNaN(end)) throw new Error('Invalid date range');
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// POST /api/reports/group-ems/sync
export const syncGroups = async (req, res, next) => {
  try {
    const result = await groupSync.syncGroupsFromEMS();
    res.json(result);
  } catch (err) {
    if (err.message?.includes('EMS API error') || err.message?.includes('STAFFING_API')) {
      return res.status(502).json({ message: 'EMS service unavailable. Check that Staffing Betit is running.' });
    }
    next(err);
  }
};

// GET /api/reports/group-ems?start=&end=
export const getGroupsSummary = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await groupReport.getGroupsSummary({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/group-ems/leaderboard?start=&end=&rankBy=
export const getLeaderboard = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const { rankBy = 'revenue' } = req.query;
    const data = await groupReport.getGroupLeaderboard({ start, end, rankBy });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/group-ems/:groupId?start=&end=
export const getGroupDetail = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await groupReport.getGroupDetail({ groupId: req.params.groupId, start, end });
    res.json(data);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message });
    next(err);
  }
};

// GET /api/reports/group-ems/:groupId/trend?start=&end=&groupBy=
export const getGroupTrend = async (req, res, next) => {
  try {
    const { start, end }  = parseDateRange(req.query);
    const { groupBy = 'day' } = req.query;
    const data = await groupReport.getGroupTrend({
      groupId: req.params.groupId === '_all' ? null : req.params.groupId,
      start, end, groupBy,
    });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/group-ems/export?start=&end=
export const exportGroups = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const csv = await groupReport.exportGroupsCSV({ start, end });
    const filename = `group_report_${new Date(start).toISOString().slice(0, 10)}_${new Date(end).toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
};
