/**
 * cron/index.js — registers all scheduled report jobs.
 * Call initCronJobs() once after the DB connection is established.
 *
 * Schedule reference (all times UTC):
 *   DAILY   → 01:00 UTC daily          "0 1 * * *"
 *   WEEKLY  → 02:00 UTC every Monday   "0 2 * * 1"
 *   MONTHLY → 03:00 UTC on the 1st     "0 3 1 * *"
 *   YEARLY  → 04:00 UTC on Jan 1st     "0 4 1 1 *"
 *
 * node-cron uses the server's local timezone unless 'timezone' is specified.
 * We pin to UTC so behavior is identical across all deployment environments.
 */

import cron from 'node-cron';
import { runDailyReport   } from './dailyReport.cron.js';
import { runWeeklyReport  } from './weeklyReport.cron.js';
import { runMonthlyReport } from './monthlyReport.cron.js';
import { runYearlyReport  } from './yearlyReport.cron.js';
import { runShiftEndingSoonCheck } from './shiftEndingSoon.cron.js';

// Wraps each job in a try/catch so a crash in one doesn't kill the process or affect others.
function safe(label, fn) {
  return async () => {
    console.log(`[CRON] Starting ${label}…`);
    try {
      await fn();
    } catch (err) {
      // cronReportService already logs + retries internally; this is a final safety net.
      console.error(`[CRON] Unhandled error in ${label}:`, err.message);
    }
  };
}

export function initCronJobs() {
  const opts = { timezone: 'UTC', scheduled: true };

  cron.schedule('0 1 * * *', safe('DAILY report',   runDailyReport),   opts);
  cron.schedule('0 2 * * 1', safe('WEEKLY report',  runWeeklyReport),  opts);
  cron.schedule('0 3 1 * *', safe('MONTHLY report', runMonthlyReport), opts);
  cron.schedule('0 4 1 1 *', safe('YEARLY report',  runYearlyReport),  opts);
  cron.schedule('* * * * *', safe('Shift ending soon check', runShiftEndingSoonCheck), opts);

  console.log('[CRON] Scheduled report jobs initialized (timezone: UTC)');
  console.log('[CRON]   Daily   → 01:00 UTC daily');
  console.log('[CRON]   Weekly  → 02:00 UTC every Monday');
  console.log('[CRON]   Monthly → 03:00 UTC on the 1st of each month');
  console.log('[CRON]   Yearly  → 04:00 UTC on January 1st');
  console.log('[CRON]   Shift ending soon → every minute');
}
