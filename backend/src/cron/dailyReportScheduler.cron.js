/**
 * dailyReportScheduler.cron.js
 *
 * Ticks every minute (see cron/index.js) and decides — from the manager's
 * live Setting.dailyReport config in the database, not a hardcoded schedule
 * — whether it's time to fire the daily report. This is what makes the
 * schedule editable from Manager → Settings → Email without a server
 * restart: the very next tick (≤ 60s later) picks up any change.
 *
 * DST is handled automatically because the local-time comparison goes
 * through utils/timezone.js, which resolves the real IANA zone rules for
 * the current instant via Intl rather than a fixed UTC offset.
 *
 * "Exactly one report per day" is enforced two ways:
 *   1. `lastSentAt`'s local calendar date (in the configured zone) is
 *      compared against today's local date — already-sent-today short-circuits.
 *   2. The claim itself is a compare-and-swap `findOneAndUpdate` keyed on the
 *      previous `lastSentAt` value (same atomic pattern as
 *      missedCheckout.cron.js), so two ticks racing on the same minute can't
 *      both win and double-send.
 *
 * The actual send (aggregation, HTML build, delivery, retry-with-backoff,
 * ReportLog persistence) is unchanged — this file only decides *when*, and
 * still delegates to dailyReport.cron.js's runDailyReport() for *what*.
 */

import Setting from '../models/Setting.js';
import { runDailyReport } from './dailyReport.cron.js';
import { getZonedParts, isValidTimeZone } from '../utils/timezone.js';

const DEFAULT_TIME = '18:00';
const DEFAULT_TIMEZONE = 'America/New_York';
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function checkAndRunDailyReport() {
  const doc = await Setting.findById('global').select('dailyReport').lean();
  const cfg = doc?.dailyReport || {};

  if (cfg.enabled === false) return; // default is enabled when unset

  const timezone = isValidTimeZone(cfg.timezone) ? cfg.timezone : DEFAULT_TIMEZONE;
  const time = TIME_RE.test(cfg.time) ? cfg.time : DEFAULT_TIME;

  const now = new Date();
  const { dateStr, hhmm } = getZonedParts(now, timezone);
  if (hhmm !== time) return; // not the configured minute in the configured zone

  const lastSentAt = cfg.lastSentAt ? new Date(cfg.lastSentAt) : null;
  const alreadySentToday = lastSentAt && getZonedParts(lastSentAt, timezone).dateStr === dateStr;
  if (alreadySentToday) return;

  // Compare-and-swap claim: only succeeds if lastSentAt still matches what we
  // just read, so a second tick that raced in during the same minute (or a
  // second process) finds no match and backs off instead of double-sending.
  const claimed = await Setting.findOneAndUpdate(
    { _id: 'global', 'dailyReport.lastSentAt': lastSentAt },
    { $set: { 'dailyReport.lastSentAt': now } }
  );
  if (!claimed) return;

  console.log(`[CRON] Daily report due at ${time} ${timezone} — sending…`);
  try {
    await runDailyReport();
  } catch (err) {
    // generateAndSendReport already retries internally and logs to ReportLog;
    // this is a final safety net. lastSentAt stays claimed for today either
    // way — a permanently-failed report should not retry every minute.
    console.error('[CRON] Daily report scheduler: unexpected error:', err.message);
  }
}
