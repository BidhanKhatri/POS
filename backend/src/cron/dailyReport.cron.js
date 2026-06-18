/**
 * Daily report — runs at 01:00 (server local time) every day.
 * Covers the full previous calendar day in LOCAL timezone —
 * matching the UI's startOfDay/endOfDay logic exactly.
 * Compares against the same day last week.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

function startOfDay(d) { const x = new Date(d); x.setHours(0,  0,  0,   0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function getRange() {
  const now       = new Date();
  const yesterday = new Date(now - 86_400_000);

  const start        = startOfDay(yesterday);
  const end          = endOfDay(yesterday);
  const compareStart = startOfDay(new Date(yesterday - 7 * 86_400_000));
  const compareEnd   = endOfDay(new Date(yesterday - 7 * 86_400_000));

  const label = start.toLocaleDateString('en-CA'); // "YYYY-MM-DD" local TZ

  return { start, end, compareStart, compareEnd, label };
}

export async function runDailyReport() {
  const { start, end, compareStart, compareEnd, label } = getRange();
  await generateAndSendReport({
    type: 'DAILY',
    label,
    start,
    end,
    compareStart,
    compareEnd,
    groupBy: 'hour',
  });
}
