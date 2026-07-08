/**
 * cron/index.js — registers all scheduled report jobs.
 * Call initCronJobs() once after the DB connection is established.
 *
 * Schedule reference:
 *   DAILY   → manager-configurable time + IANA timezone, checked every minute
 *             (see dailyReportScheduler.cron.js + Setting.dailyReport).
 *             Manager → Settings → Email → Daily Report Schedule changes take
 *             effect on the next tick, no server restart needed.
 *
 * WEEKLY/MONTHLY/YEARLY report jobs are disabled for now — only the daily
 * report is wanted at this time. Re-enable by uncommenting below.
 *
 * The DAILY send time is resolved against the real IANA zone rules (via
 * Intl in utils/timezone.js) every tick, so DST is handled automatically —
 * no fixed UTC offset. The sales-day *content* boundary is separately
 * computed in Nepal time in dailyReport.cron.js, since that's where the
 * store/staff operate — the two are independent concerns.
 */

import cron from 'node-cron';
import { checkAndRunDailyReport } from './dailyReportScheduler.cron.js';
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

  cron.schedule('* * * * *',  safe('Daily report scheduler', checkAndRunDailyReport), utcOpts);
  // cron.schedule('0 2 * * 1',  safe('WEEKLY report',  runWeeklyReport),  utcOpts); // disabled for now
  // cron.schedule('0 3 1 * *',  safe('MONTHLY report', runMonthlyReport), utcOpts); // disabled for now
  // cron.schedule('0 4 1 1 *',  safe('YEARLY report',  runYearlyReport),  utcOpts); // disabled for now
  cron.schedule('* * * * *',  safe('Shift ending soon check', runShiftEndingSoonCheck), utcOpts);
  cron.schedule('* * * * *',  safe('Missed checkout check', runMissedCheckoutCheck), utcOpts);

  console.log('[CRON] Scheduled report jobs initialized');
  console.log('[CRON]   Daily   → manager-configurable time/timezone, checked every minute (DST-aware)');
  console.log('[CRON]   (Weekly/Monthly/Yearly reports disabled)');
  console.log('[CRON]   Shift ending soon → every minute');
  console.log('[CRON]   Missed checkout check → every minute');
}
