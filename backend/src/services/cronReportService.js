/**
 * cronReportService.js
 * Orchestrates scheduled report generation:
 *   1. Idempotency check (skip if already sent for this period)
 *   2. Parallel aggregation via reportService
 *   3. HTML build via reportEmailService
 *   4. Recipient lookup from the manager-configured Email Recipients list
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
  getProductSalesDetail,
  getRefunds,
} from './reportService.js';
import { getPosGroupsSummary } from './posGroupReportService.js';
import { buildReportHtml, buildReportText } from './reportEmailService.js';
import { sendReportEmail } from './emailService.js';
import Setting from '../models/Setting.js';
import ReportLog from '../models/ReportLog.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES    = 3;
// Exponential backoff: 1 min → 5 min → 15 min
const RETRY_DELAYS   = [60_000, 300_000, 900_000];

// Shared POS inbox — used whenever no manager has configured recipients yet.
const DEFAULT_REPORT_RECIPIENTS = ['staffingbetit@gmail.com'];

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

// Returns the manager-configured report recipient email addresses,
// falling back to the shared POS inbox if none have been set.
async function getReportRecipients() {
  const doc = await Setting.findById('global').select('reportRecipients').lean();
  const emails = doc?.reportRecipients?.length ? doc.reportRecipients : DEFAULT_REPORT_RECIPIENTS;
  return emails.map((email) => ({ email }));
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
 * @param {boolean}[opts.force]      – bypass the "already sent today" idempotency
 *   check and send a single attempt with no retry/backoff delay. Used by the
 *   manager-facing "Send Report Now" button, which is a synchronous HTTP call
 *   that shouldn't block for the scheduled job's multi-minute backoff window.
 * @returns {Promise<{success: boolean, recipients?: string[], error?: string}>}
 */
export async function generateAndSendReport({
  type,
  label,
  start,
  end,
  compareStart,
  compareEnd,
  groupBy = 'day',
  force = false,
}) {
  // ── Idempotency: skip if this period already succeeded (unless forced) ──
  const existing = await ReportLog.findOne({ type, periodStart: start });
  if (!force && existing?.status === 'SUCCESS') {
    console.log(`[CRON] ${type} report for ${label} already sent — skipping`);
    return { success: true, skipped: true, recipients: existing.recipients ?? [] };
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

  // A forced/manual send is a synchronous request a manager is waiting on —
  // one attempt, no multi-minute backoff sleep between retries.
  const attempts = force ? 1 : MAX_RETRIES;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      log.attemptCount = (log.attemptCount ?? 0) + 1;
      log.status = 'PENDING';
      await log.save();

      // ── 1. Aggregate all report data in parallel ──
      const [summary, trend, payments, products, cashiers, productSales, refunds, groupsData] = await Promise.all([
        getSummary({ start: s, end: e, compareStart: cs, compareEnd: ce }),
        getTrend({ start: s, end: e, groupBy }),
        getPayments({ start: s, end: e }),
        getProducts({ start: s, end: e, limit: productLimit }),
        getCashiers({ start: s, end: e }),
        getProductSalesDetail({ start: s, end: e }),
        getRefunds({ start: s, end: e }),
        getPosGroupsSummary({ start: s, end: e }).catch(() => ({ groups: [] })),
      ]);
      const groups = groupsData?.groups ?? [];

      // ── 2. Get configured report recipients ──
      const recipients = await getReportRecipients();
      if (recipients.length === 0) {
        console.warn(`[CRON] ${type}: No report recipients configured — skipping send`);
        log.status     = 'SUCCESS';  // not a retry-able error
        log.sentAt     = new Date();
        log.recipients = [];
        await log.save();
        return { success: true, recipients: [] };
      }

      // ── 3. Build HTML + plain-text alternative ──
      const html    = buildReportHtml({ type, label, start, end, summary, payments, products, cashiers, productSales, refunds, trend, groups });
      const text    = buildReportText({ type, label, start, end, summary, payments, products, cashiers, productSales, refunds, trend, groups });
      const subject = reportSubject(type, label);

      // ── 4. Send to every admin ──
      await Promise.all(
        recipients.map((r) => sendReportEmail({ to: r.email, subject, html, text }))
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
      return { success: true, recipients: recipients.map((r) => r.email) };

    } catch (err) {
      console.error(`[CRON] ${type} report "${label}" attempt ${attempt + 1} failed:`, err.message);
      log.status    = 'FAILED';
      log.lastError = err.message;
      await log.save();

      if (attempt < attempts - 1) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`[CRON] Retrying in ${delay / 1000}s…`);
        await sleep(delay);
      }
    }
  }

  console.error(
    `[CRON] ✗ ${type} report "${label}" ${force ? 'failed' : `permanently failed after ${attempts} attempts`} — check ReportLog collection`
  );
  return { success: false, error: log.lastError };
}
