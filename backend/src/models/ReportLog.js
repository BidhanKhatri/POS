import mongoose from 'mongoose';

// Tracks every scheduled report run — used for idempotency, auditing, and retry tracking.
const reportLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
      required: true,
    },
    // Human-readable period label, e.g. "2024-01-15", "2024-W03", "2024-01", "2024"
    label: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd:   { type: Date, required: true },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    attemptCount: { type: Number, default: 0 },
    lastError:    { type: String },
    sentAt:       { type: Date },
    recipients:   [{ type: String }],

    // Lightweight summary snapshot stored for audit without needing to re-aggregate
    reportSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Unique per report type + period start — prevents duplicate sends on server restart
reportLogSchema.index({ type: 1, periodStart: 1 }, { unique: true });

export default mongoose.model('ReportLog', reportLogSchema);
