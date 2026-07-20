/**
 * timezone.js — DST-safe IANA timezone -> UTC conversion using the
 * platform's built-in Intl API (no extra dependency). Mirrors
 * backend/src/utils/timezone.js's zonedTimeToUtc so the frontend can
 * reconstruct "9:00 AM in America/New_York" as the correct UTC instant
 * regardless of the browser's own local timezone.
 */

function partsAsUtcMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = dtf.formatToParts(date).reduce((acc, x) => {
    if (x.type !== 'literal') acc[x.type] = x.value;
    return acc;
  }, {});
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
}

function getTimezoneOffsetMs(date, timeZone) {
  return partsAsUtcMs(date, timeZone) - date.getTime();
}

// Converts a local wall-clock time (year/month/day/hour/minute) in `timeZone`
// to the real UTC instant it represents. Iterates twice to converge across a
// DST transition boundary.
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(target);
  for (let i = 0; i < 2; i++) {
    const offsetMs = getTimezoneOffsetMs(guess, timeZone);
    guess = new Date(target - offsetMs);
  }
  return guess;
}

// Converts "YYYY-MM-DD" + "HH:mm" + IANA timeZone to a UTC Date instant.
export function ymdHmToUtc(ymd, hhmm, timeZone) {
  const [year, month, day] = ymd.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  return zonedTimeToUtc(year, month, day, hour, minute, timeZone);
}

// The device's own local calendar date as YYYY-MM-DD — deliberately NOT
// `date.toISOString().slice(0, 10)`, which is UTC-based and can report the
// wrong calendar day for whoever's actually looking at the screen (e.g.
// still showing "yesterday" in UTC just after local midnight in a
// timezone ahead of UTC, or already "tomorrow" in UTC while it's still
// evening in a timezone behind UTC). Schedules are keyed by the employee's
// own local day, so "today" for a schedule lookup must be their local
// day too, not UTC's.
export function localYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
