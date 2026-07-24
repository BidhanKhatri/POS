/**
 * EmsSyncLog — audit trail of every inbound EMS attendance webhook attempt.
 *
 * Distinct from AuditLog (which stays scoped to Shift-level business actions
 * like EMS_CLOCK_IN/EMS_CLOCK_OUT): this collection records the sync
 * operation itself — including rejected/duplicate/errored attempts that never
 * produced a Shift mutation — so support can answer "did EMS's clock-out for
 * employee X actually reach POS, and what happened to it?" without digging
 * through server logs.
 *
 * The unique index on emsEventId is the idempotency backstop: a duplicate
 * webhook delivery (EMS retry) fails the insert and is treated as DUPLICATE
 * by the caller instead of double-processing.
 */
import mongoose from 'mongoose';

const emsSyncLogSchema = new mongoose.Schema(
  {
    emsEventId: {
      type:     String,
      required: true,
      unique:   true,
    },
    eventType: {
      type:     String,
      enum:     ['CLOCK_IN', 'CLOCK_OUT'],
      required: true,
    },
    matchMethod: {
      type:     String,
      enum:     ['staffingBetitEmployeeId', 'email', 'none'],
      required: true,
    },
    matchValue: {
      type:    String,
      default: null,
    },
    posEmployeeId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    shiftId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Shift',
      default: null,
    },
    status: {
      type:     String,
      enum:     ['SUCCESS', 'DUPLICATE', 'SKIPPED', 'REJECTED', 'ERROR'],
      required: true,
    },
    errorMessage: {
      type:    String,
      default: null,
    },
    // When EMS says the clock event actually happened (not when POS received it)
    emsTimestamp: {
      type:    Date,
      default: null,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

emsSyncLogSchema.index({ posEmployeeId: 1, createdAt: -1 });
emsSyncLogSchema.index({ status: 1 });

export default mongoose.model('EmsSyncLog', emsSyncLogSchema);
