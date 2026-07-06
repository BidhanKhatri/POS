/**
 * Daily report — triggered at 18:00 America/New_York (see cron/index.js).
 * Covers the full previous calendar day in NEPAL time (Asia/Kathmandu, UTC+5:45) —
 * that's where the store and staff operate, so a "sales day" means midnight-to-
 * midnight Nepal time regardless of the server's own timezone or the US
 * recipient's timezone. Compares against the same Nepal day last week.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000; // UTC+5:45, fixed (no DST in Nepal)

// Returns the {year, month, day} of the given instant as seen on a Nepal wall clock.
function nepalDateParts(instant) {
  const shifted = new Date(instant.getTime() + NEPAL_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

// Midnight-to-midnight range (Nepal wall clock) for the Nepal calendar day
// that `instant` falls on, expressed as real UTC Date instants.
function nepalDayRange(instant) {
  const { y, m, d } = nepalDateParts(instant);
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - NEPAL_OFFSET_MS);
  const end   = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - NEPAL_OFFSET_MS);
  return { start, end };
}

function getRange() {
  const now       = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000); // lands safely within the just-closed Nepal day

  const { start, end } = nepalDayRange(yesterday);
  const { start: compareStart, end: compareEnd } = nepalDayRange(new Date(yesterday.getTime() - 7 * 86_400_000));

  const { y, m, d } = nepalDateParts(yesterday);
  const label = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; // "YYYY-MM-DD" in Nepal time

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
