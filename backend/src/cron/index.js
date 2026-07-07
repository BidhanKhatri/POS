/**
 * cron/index.js — registers all scheduled report jobs.
 * Call initCronJobs() once after the DB connection is established.
 *
 * Schedule reference:
 *   DAILY   → 18:00 America/New_York daily   "0 18 * * *"  (recipients are US-based managers)
 *
 * WEEKLY/MONTHLY/YEARLY report jobs are disabled for now — only the daily
 * report is wanted at this time. Re-enable by uncommenting below.
 *
 * The DAILY job is pinned to the 'America/New_York' IANA zone (not a fixed UTC
 * offset) so delivery stays at 6pm Eastern year-round — node-cron adjusts for
 * US daylight saving automatically. The sales-day boundary itself is computed
 * in Nepal time in dailyReport.cron.js, since that's where the store/staff
 * operate — the two are independent concerns.
 */

import cron from 'node-cron';
import { runDailyReport   } from './dailyReport.cron.js';
// import { runWeeklyReport  } from './weeklyReport.cron.js'; // disabled for now — re-enable when weekly reports return
// import { runMonthlyReport } from './monthlyReport.cron.js'; // disabled for now — re-enable when monthly reports return
// import { runYearlyReport  } from './yearlyReport.cron.js'; // disabled for now — re-enable when yearly reports return
import { runShiftEndingSoonCheck } from './shiftEndingSoon.cron.js';
import { runMissedCheckoutCheck } from './missedCheckout.cron.js';

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
  const utcOpts = { timezone: 'UTC', scheduled: true };
  const dailyOpts = { timezone: 'America/New_York', scheduled: true };

  cron.schedule('0 18 * * *', safe('DAILY report',   runDailyReport),   dailyOpts);
  // cron.schedule('0 2 * * 1',  safe('WEEKLY report',  runWeeklyReport),  utcOpts); // disabled for now
  // cron.schedule('0 3 1 * *',  safe('MONTHLY report', runMonthlyReport), utcOpts); // disabled for now
  // cron.schedule('0 4 1 1 *',  safe('YEARLY report',  runYearlyReport),  utcOpts); // disabled for now
  cron.schedule('* * * * *',  safe('Shift ending soon check', runShiftEndingSoonCheck), utcOpts);
  cron.schedule('* * * * *',  safe('Missed checkout check', runMissedCheckoutCheck), utcOpts);

  console.log('[CRON] Scheduled report jobs initialized');
  console.log('[CRON]   Daily   → 18:00 America/New_York daily (6pm Eastern, DST-aware)');
  console.log('[CRON]   (Weekly/Monthly/Yearly reports disabled)');
  console.log('[CRON]   Shift ending soon → every minute');
  console.log('[CRON]   Missed checkout check → every minute');
}
