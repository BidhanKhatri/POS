/**
 * testReport.js — one-shot manual trigger for local testing.
 *
 * Covers TODAY using the identical date-range logic as the UI's "Today" preset
 * in buildDateRange(), so you can immediately verify the email against
 * /manager/reports/overall with the "Today" range selected.
 *
 * Bypasses the ReportLog idempotency check — safe to run multiple times.
 *
 * Usage:
 *   npm run test:report
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import {
  getSummary, getTrend, getPayments,
  getProducts, getCashiers, getProductSalesDetail, getRefunds,
} from '../services/reportService.js';
import { getPosGroupsSummary } from '../services/posGroupReportService.js';
import { buildReportHtml, buildReportText } from '../services/reportEmailService.js';
import { sendReportEmail  } from '../services/emailService.js';

const TEST_RECIPIENT = 'khatribidhan9@gmail.com';

// ── Mirrors the UI's buildDateRange('today') exactly ─────────────────────────
function getTodayRange() {
  const now = new Date();

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,  0,  0,   0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  const start        = startOfDay(now);
  const end          = endOfDay(now);
  // Compare against yesterday — same as UI
  const compareStart = startOfDay(new Date(now - 86_400_000));
  const compareEnd   = endOfDay(new Date(now - 86_400_000));

  const label = start.toLocaleDateString('en-CA'); // "YYYY-MM-DD" in local TZ

  return { start, end, compareStart, compareEnd, label };
}

async function main() {
  console.log('[TEST] Connecting to MongoDB…');
  await connectDB();

  const { start, end, compareStart, compareEnd, label } = getTodayRange();

  console.log(`[TEST] Date range  : ${start.toISOString()} → ${end.toISOString()}`);
  console.log(`[TEST] Compare     : ${compareStart.toISOString()} → ${compareEnd.toISOString()}`);
  console.log(`[TEST] Label       : ${label}`);
  console.log('[TEST] Generating DAILY report…');

  const s  = start.toISOString();
  const e  = end.toISOString();
  const cs = compareStart.toISOString();
  const ce = compareEnd.toISOString();

  const [summary, trend, payments, products, cashiers, productSales, refunds, groupsData] = await Promise.all([
    getSummary({ start: s, end: e, compareStart: cs, compareEnd: ce }),
    getTrend({ start: s, end: e, groupBy: 'hour' }),
    getPayments({ start: s, end: e }),
    getProducts({ start: s, end: e, limit: 10, sortBy: 'revenue' }),
    getCashiers({ start: s, end: e }),
    getProductSalesDetail({ start: s, end: e }),
    getRefunds({ start: s, end: e }),
    getPosGroupsSummary({ start: s, end: e }).catch(() => ({ groups: [] })),
  ]);
  const groups = groupsData?.groups ?? [];

  console.log('[TEST] Aggregation complete:');
  console.log(`       Gross Revenue: $${summary.current?.grossRevenue ?? 0}`);
  console.log(`       Net Revenue  : $${summary.current?.netRevenue ?? 0}`);
  console.log(`       Transactions : ${summary.current?.txnCount ?? 0}`);
  console.log(`       Refunded     : $${summary.current?.refundedAmount ?? 0}`);
  console.log(`       Avg Ticket   : $${summary.current?.avgTicket ?? 0}`);
  console.log(`       Products     : ${products.length}`);
  console.log(`       Cashiers     : ${cashiers.length}`);

  const html    = buildReportHtml({ type: 'DAILY', label, start, end, summary, payments, products, cashiers, productSales, refunds, trend, groups });
  const text    = buildReportText({ type: 'DAILY', label, start, end, summary, payments, products, cashiers, productSales, refunds, trend, groups });
  const subject = `Daily Sales Report — ${label}`;

  console.log(`\n[TEST] Sending to ${TEST_RECIPIENT}…`);
  await sendReportEmail({ to: TEST_RECIPIENT, subject, html, text });
  console.log(`[TEST] ✓ Done. Compare this email against /manager/reports/overall → "Today" preset.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[TEST] ✗ Failed:', err.message);
  process.exit(1);
});
