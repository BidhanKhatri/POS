/**
 * Yearly report — runs at 04:00 (server local time) on January 1st.
 * Covers the full prior calendar year in LOCAL timezone, matching the UI's
 * "Year" preset: new Date(now.getFullYear()-1, 0, 1) → new Date(now.getFullYear()-1, 11, 31).
 * Compares against the year before that.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

function startOfDay(d) { const x = new Date(d); x.setHours(0,  0,  0,   0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getRange() {
  const now      = new Date();
  const lastYear = now.getFullYear() - 1;

  const start = startOfDay(new Date(lastYear, 0,  1));  // Jan 1  local midnight
  const end   = endOfDay(new Date(lastYear,   11, 31)); // Dec 31 local end-of-day

  const compareStart = startOfDay(new Date(lastYear - 1, 0,  1));
  const compareEnd   = endOfDay(new Date(lastYear - 1,   11, 31));

  const label = String(lastYear);

  return { start, end, compareStart, compareEnd, label };
}

export async function runYearlyReport() {
  const { start, end, compareStart, compareEnd, label } = getRange();
  await generateAndSendReport({
    type: 'YEARLY',
    label,
    start,
    end,
    compareStart,
    compareEnd,
    groupBy: 'month',
  });
}
