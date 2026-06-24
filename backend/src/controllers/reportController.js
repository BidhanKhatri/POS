import * as reportService from '../services/reportService.js';

// Helper: parse and validate date range from query
function parseDateRange(query) {
  const end   = query.end   ? new Date(query.end)   : new Date();
  const start = query.start ? new Date(query.start) : (() => {
    const d = new Date(end);
    d.setDate(d.getDate() - 30);
    return d;
  })();
  if (isNaN(start) || isNaN(end)) throw new Error('Invalid date range');
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /api/reports/summary
const getSummary = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const { compareStart, compareEnd } = req.query;
    const data = await reportService.getSummary({ start, end, compareStart, compareEnd });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/trend
const getTrend = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const { groupBy, compareStart, compareEnd } = req.query;
    const data = await reportService.getTrend({ start, end, groupBy, compareStart, compareEnd });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/payments
const getPayments = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getPayments({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/products
const getProducts = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const { limit = 10, sortBy = 'revenue' } = req.query;
    const data = await reportService.getProducts({ start, end, limit, sortBy });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/cashiers
const getCashiers = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getCashiers({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/refunds
const getRefunds = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getRefunds({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/heatmap
const getHeatmap = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getHeatmap({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/groups
const getShiftGroups = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getShiftGroups({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/anomalies
const getAnomalies = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getAnomalies({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/insights
const getInsights = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getInsights({ start, end });
    res.json(data);
  } catch (err) { next(err); }
};

// GET /api/reports/export?format=csv
const exportReport = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const format = (req.query.format || 'csv').toLowerCase();

    if (format === 'csv') {
      const csv = await reportService.exportCSV({ start, end });
      const filename = `report_${new Date(start).toISOString().slice(0, 10)}_${new Date(end).toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    res.status(400).json({ message: `Unsupported export format: ${format}` });
  } catch (err) { next(err); }
};

// GET /api/reports/employee/:id
const getEmployeeDetail = async (req, res, next) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await reportService.getEmployeeReport({ employeeId: req.params.id, start, end });
    res.json(data);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ message: err.message });
    next(err);
  }
};

export {
  getSummary,
  getTrend,
  getPayments,
  getProducts,
  getCashiers,
  getRefunds,
  getHeatmap,
  getShiftGroups,
  getAnomalies,
  getInsights,
  exportReport,
  getEmployeeDetail,
};
