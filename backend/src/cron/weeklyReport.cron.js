/**
 * Weekly report — runs at 02:00 (server local time) every Monday.
 * Covers the prior Monday–Sunday in LOCAL timezone, matching the UI's
 * "Week" preset which uses: start = 6 days ago midnight, end = today midnight.
 *
 * For the scheduled report (runs Monday morning) we cover last week:
 *   start = 7 days ago Monday 00:00 local
 *   end   = yesterday (Sunday) 23:59:59.999 local
 *
 * Compare: the week before that.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

function startOfDay(d) { const x = new Date(d); x.setHours(0,  0,  0,   0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
}

function getRange() {
  const now = new Date();

  // This runs on Monday: "last week" = Mon-Sun of the previous week
  const yesterday = new Date(now - 86_400_000);          // Sunday just passed
  const end        = endOfDay(yesterday);
  const start      = startOfDay(new Date(yesterday - 6 * 86_400_000)); // Monday

  const compareEnd   = startOfDay(start);                 // day before last week's Monday
  compareEnd.setHours(23, 59, 59, 999);
  const compareStart = startOfDay(new Date(start - 7 * 86_400_000));

  const week  = getISOWeek(start);
  const label = `${start.getFullYear()}-W${String(week).padStart(2, '0')}`;

  return { start, end, compareStart, compareEnd, label };
}

export async function runWeeklyReport() {
  const { start, end, compareStart, compareEnd, label } = getRange();
  await generateAndSendReport({
    type: 'WEEKLY',
    label,
    start,
    end,
    compareStart,
    compareEnd,
    groupBy: 'day',
  });
}
