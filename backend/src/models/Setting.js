import mongoose from 'mongoose';

// Singleton document keyed by the string '_id: "global"'.
// Use findByIdAndUpdate with upsert:true to read-modify-write safely.
const settingSchema = new mongoose.Schema({
  _id: { type: String },
  maxPriceVariancePercent: { type: Number, default: 10, min: 0, max: 100 },
  syncStaffingBetit:       { type: Boolean, default: false },
  stockTrackingEnabled:    { type: Boolean, default: true  },
  storeName:               { type: String,  default: ''    },
  // Recipients for the scheduled sales report emails (daily/weekly/monthly/yearly).
  // Defaults to the shared POS inbox when the manager hasn't configured any yet.
  reportRecipients: { type: [String], default: ['staffingbetit@gmail.com'] },
  // Timezone-aware daily report send schedule — read fresh by the cron every
  // minute (see cron/dailyReportScheduler.cron.js), so changes here take
  // effect immediately with no server restart. `time` is 24-hour "HH:mm" in
  // `timezone` (an IANA zone name); `lastSentAt` is the UTC instant of the
  // last successful send, used to dedupe to exactly one send per local day.
  dailyReport: {
    enabled:    { type: Boolean, default: true },
    time:       { type: String,  default: '18:00' },
    timezone:   { type: String,  default: 'America/New_York' },
    lastSentAt: { type: Date,    default: null },
  },
  storeLogo: {
    url:      { type: String, default: null },
    fileId:   { type: String, default: null },
    fileName: { type: String, default: null },
  },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
