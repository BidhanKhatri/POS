/**
 * timezone.js — DST-safe IANA timezone <-> UTC conversions using the
 * platform's built-in Intl API (no external dependency required; Node ships
 * full ICU by default). Used by the daily report scheduler to compare "now"
 * against a manager-configured local send time in any timezone, and to
 * compute the next scheduled send instant for display in the UI.
 *
 * The offset-lookup technique (format an instant into a zone, re-parse it as
 * if it were UTC, diff against the original instant) is the standard
 * dependency-free way to get a zone's UTC offset at an arbitrary instant —
 * it automatically reflects DST because Intl resolves the real zone rules.
 */

// Formats `date` as wall-clock parts in `timeZone`, then reinterprets those
// parts as UTC to get "what UTC instant has these same digits" — the delta
// between that and the real instant is the zone's offset at that moment.
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
// DST transition boundary (the offset itself can change between the first
// guess and the corrected instant).
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(target);
  for (let i = 0; i < 2; i++) {
    const offsetMs = getTimezoneOffsetMs(guess, timeZone);
    guess = new Date(target - offsetMs);
  }
  return guess;
}

// Returns the wall-clock date/time parts for `date` as seen in `timeZone`.
export function getZonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const p = dtf.formatToParts(date).reduce((acc, x) => {
    if (x.type !== 'literal') acc[x.type] = x.value;
    return acc;
  }, {});
  const hour = p.hour === '24' ? '00' : p.hour;
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${hour}:${p.minute}`,
  };
}

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Next UTC instant at which local wall-clock time `HH:mm` occurs in
// `timeZone`, strictly after `after`. Used to show "next scheduled send" in
// the manager UI without duplicating this offset math on the frontend.
export function computeNextRunUtc(time, timeZone, after = new Date()) {
  const [hh, mm] = time.split(':').map(Number);
  const { year, month, day } = getZonedParts(after, timeZone);
  let candidate = zonedTimeToUtc(year, month, day, hh, mm, timeZone);
  if (candidate <= after) {
    const rolled = getZonedParts(new Date(candidate.getTime() + 24 * 3600 * 1000), timeZone);
    candidate = zonedTimeToUtc(rolled.year, rolled.month, rolled.day, hh, mm, timeZone);
  }
  return candidate;
}
