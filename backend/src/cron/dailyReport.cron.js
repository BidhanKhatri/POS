/**
 * Daily report — send time/timezone are manager-configurable via
 * Setting.dailyReport (Manager → Settings → Email), evaluated every minute
 * by cron/dailyReportScheduler.cron.js. This file only builds the report
 * *content* and sends it; it has no opinion on schedule.
 *
 * Covers TODAY so far — Nepal midnight (Asia/Kathmandu, UTC+5:45, where the
 * store/staff operate) up through the instant the report is generated —
 * rather than the previous full day, so same-day sales actually appear in
 * today's report instead of only showing up tomorrow. Numbers are partial
 * if sent before close of business; that's expected for an intraday send
 * time. Compares against the same Nepal day last week, cut off at the same
 * local wall-clock time, so the delta is apples-to-apples rather than a
 * partial day vs. a full one.
 */

import { generateAndSendReport } from '../services/cronReportService.js';

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000; // UTC+5:45, fixed (no DST in Nepal)

// Returns the {year, month, day} of the given instant as seen on a Nepal wall clock.
function nepalDateParts(instant) {
  const shifted = new Date(instant.getTime() + NEPAL_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

// Nepal-wall-clock midnight for the Nepal calendar day that `instant` falls
// on, expressed as a real UTC Date instant.
function nepalDayStart(instant) {
  const { y, m, d } = nepalDateParts(instant);
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - NEPAL_OFFSET_MS);
}

function getRange() {
  const now = new Date(); // the instant the report is generated — also the "up to" cutoff

  const start = nepalDayStart(now);
  const end   = now;

  const compareNow   = new Date(now.getTime() - 7 * 86_400_000); // same wall-clock time, 7 days earlier
  const compareStart = nepalDayStart(compareNow);
  const compareEnd   = compareNow;

  const { y, m, d } = nepalDateParts(now);
  const label = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; // "YYYY-MM-DD" in Nepal time

  return { start, end, compareStart, compareEnd, label };
}

export async function runDailyReport({ force = false } = {}) {
  const { start, end, compareStart, compareEnd, label } = getRange();
  return generateAndSendReport({
    type: 'DAILY',
    label,
    start,
    end,
    compareStart,
    compareEnd,
    groupBy: 'hour',
    force,
  });
}
