import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clockInTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  clockOutTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN',
  },
  openingCash: {
    type: Number,
    required: true,
    default: 0,
  },
  closingCash: {
    type: Number,
    default: 0,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalRefunds: {
    type: Number,
    default: 0,
  },
  totalTransactions: {
    type: Number,
    default: 0,
  },
  shiftDate: {
    type: Date,
    required: true,
    set: function(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    },
  },

  // ── Schedule linkage (set at clock-in time) ───────────────────────────────
  scheduleId:     { type: String, default: null },  // EMS _id or PosSchedule _id
  scheduleSource: { type: String, enum: ['EMS', 'POS', 'MANUAL'], default: 'MANUAL' },
  scheduledStart: { type: String, default: null },  // HH:mm — copied from schedule
  scheduledEnd:   { type: String, default: null },  // HH:mm
  scheduledDate:  { type: String, default: null },  // YYYY-MM-DD

  // ── Clock-out metadata ────────────────────────────────────────────────────
  clockOutReason: { type: String, default: null },
  earlyClockOut:  { type: Boolean, default: false },

  // Set once the "shift ending soon" cron has pushed its socket warning for
  // this shift — prevents re-notifying the employee every minute the cron runs.
  endingSoonNotifiedAt: { type: Date, default: null },

  // ── Missed checkout / forced checkout ─────────────────────────────────────
  // Set once the missed-checkout cron detects this shift is still OPEN past
  // its scheduledEnd — dedupes detection the same way endingSoonNotifiedAt does.
  missedCheckoutDetectedAt: { type: Date, default: null },
  forcedCheckout:           { type: Boolean, default: false },
  forcedCheckoutBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
});

// Indexes based on Database_Agent.md
shiftSchema.index({ employeeId: 1, shiftDate: 1 });
shiftSchema.index({ status: 1 });

export default mongoose.model('Shift', shiftSchema);
