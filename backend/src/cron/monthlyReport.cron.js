/**
 * Monthly report — runs at 03:00 (server local time) on the 1st of each month.
 * Covers the full prior calendar month in LOCAL timezone, matching the UI's
 * "Month" preset: new Date(now.getFullYear(), now.getMonth()-1, 1) → last day of that month.
 * Compares against the same month last year.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

function startOfDay(d) { const x = new Date(d); x.setHours(0,  0,  0,   0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getRange() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth(); // 0-based: current month

  // First day of last month, last day of last month
  const start = startOfDay(new Date(y, m - 1, 1));
  const end   = endOfDay(new Date(y, m, 0));       // day 0 of current month = last day of prev month

  // Same month last year
  const compareStart = startOfDay(new Date(y - 1, m - 1, 1));
  const compareEnd   = endOfDay(new Date(y - 1, m, 0));

  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`; // "2024-01"

  return { start, end, compareStart, compareEnd, label };
}

export async function runMonthlyReport() {
  const { start, end, compareStart, compareEnd, label } = getRange();
  await generateAndSendReport({
    type: 'MONTHLY',
    label,
    start,
    end,
    compareStart,
    compareEnd,
    groupBy: 'week',
  });
}
