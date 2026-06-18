/**
 * cronReportService.js
 * Orchestrates scheduled report generation:
 *   1. Idempotency check (skip if already sent for this period)
 *   2. Parallel aggregation via reportService
 *   3. HTML build via reportEmailService
 *   4. Admin recipient lookup from User collection
 *   5. Email delivery via emailService
 *   6. ReportLog persistence
 *   7. Retry with exponential backoff on failure
 */

import {
  getSummary,
  getTrend,
  getPayments,
  getProducts,
  getCashiers,
  getRefunds,
} from './reportService.js';
import { buildReportHtml } from './reportEmailService.js';
import { sendReportEmail } from './emailService.js';
import User from '../models/User.js';
import ReportLog from '../models/ReportLog.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES    = 3;
// Exponential backoff: 1 min → 5 min → 15 min
const RETRY_DELAYS   = [60_000, 300_000, 900_000];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reportSubject(type, label) {
  return {
    DAILY:   `Daily Sales Report — ${label}`,
    WEEKLY:  `Weekly Sales Report — ${label}`,
    MONTHLY: `Monthly Sales Report — ${label}`,
    YEARLY:  `Annual Sales Report — ${label}`,
  }[type] ?? `Sales Report — ${label}`;
}

// Returns all active Admin + Manager users that have an email address.
async function getAdminRecipients() {
  return User.find({
    role: { $in: ['Admin', 'Manager'] },
    isActive: true,
    email: { $exists: true, $ne: '' },
  })
    .select('email name role')
    .lean();
}

// ─── Core orchestrator ────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'} opts.type
 * @param {string}  opts.label        – human-readable period, e.g. "2024-01-15"
 * @param {Date}    opts.start        – period start (UTC midnight)
 * @param {Date}    opts.end          – period end   (UTC 23:59:59.999)
 * @param {Date}   [opts.compareStart]– prior period start for delta %
 * @param {Date}   [opts.compareEnd]  – prior period end
 * @param {string} [opts.groupBy]     – 'hour'|'day'|'week'|'month' for trend chart
 */
export async function generateAndSendReport({
  type,
  label,
  start,
  end,
  compareStart,
  compareEnd,
  groupBy = 'day',
}) {
  // ── Idempotency: skip if this period already succeeded ──
  const existing = await ReportLog.findOne({ type, periodStart: start });
  if (existing?.status === 'SUCCESS') {
    console.log(`[CRON] ${type} report for ${label} already sent — skipping`);
    return;
  }

  // Upsert the log entry (creates on first attempt, reuses on retry)
  const log = existing ?? new ReportLog({
    type,
    label,
    periodStart: start,
    periodEnd:   end,
    status:      'PENDING',
  });

  const s   = start.toISOString();
  const e   = end.toISOString();
  const cs  = compareStart?.toISOString();
  const ce  = compareEnd?.toISOString();

  // Product/cashier limits by report type
  const productLimit = type === 'DAILY' ? 5 : 10;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      log.attemptCount = (log.attemptCount ?? 0) + 1;
      log.status = 'PENDING';
      await log.save();

      // ── 1. Aggregate all report data in parallel ──
      const [summary, trend, payments, products, cashiers, refunds] = await Promise.all([
        getSummary({ start: s, end: e, compareStart: cs, compareEnd: ce }),
        getTrend({ start: s, end: e, groupBy }),
        getPayments({ start: s, end: e }),
        getProducts({ start: s, end: e, limit: productLimit }),
        getCashiers({ start: s, end: e }),
        getRefunds({ start: s, end: e }),
      ]);

      // ── 2. Get admin recipients ──
      const recipients = await getAdminRecipients();
      if (recipients.length === 0) {
        console.warn(`[CRON] ${type}: No admin recipients with email — skipping send`);
        log.status     = 'SUCCESS';  // not a retry-able error
        log.sentAt     = new Date();
        log.recipients = [];
        await log.save();
        return;
      }

      // ── 3. Build HTML ──
      const html    = buildReportHtml({ type, label, start, end, summary, payments, products, cashiers, refunds, trend });
      const subject = reportSubject(type, label);

      // ── 4. Send to every admin ──
      await Promise.all(
        recipients.map((r) => sendReportEmail({ to: r.email, subject, html }))
      );

      // ── 5. Mark success ──
      log.status         = 'SUCCESS';
      log.sentAt         = new Date();
      log.recipients     = recipients.map((r) => r.email);
      log.reportSnapshot = {
        netRevenue:    summary.current?.netRevenue,
        txnCount:      summary.current?.txnCount,
        refundedAmount:summary.current?.refundedAmount,
        productsCount: products.length,
        cashiersCount: cashiers.length,
      };
      await log.save();

      console.log(
        `[CRON] ✓ ${type} report "${label}" sent to ${recipients.length} recipient(s): ${recipients.map((r) => r.email).join(', ')}`
      );
      return;

    } catch (err) {
      console.error(`[CRON] ${type} report "${label}" attempt ${attempt + 1} failed:`, err.message);
      log.status    = 'FAILED';
      log.lastError = err.message;
      await log.save();

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`[CRON] Retrying in ${delay / 1000}s…`);
        await sleep(delay);
      }
    }
  }

  console.error(
    `[CRON] ✗ ${type} report "${label}" permanently failed after ${MAX_RETRIES} attempts — check ReportLog collection`
  );
}
