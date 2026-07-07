import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  entity: {
    type: String,
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  beforeData: {
    type: mongoose.Schema.Types.Mixed,
  },
  afterData: {
    type: mongoose.Schema.Types.Mixed,
  },
  // performedBy/role are null only for system-generated entries (e.g. the
  // missed-checkout cron detecting a stale shift with no human actor) —
  // every manager/employee-initiated action still always supplies both.
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  role: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // Explicitly false as we manage timestamp manually above, but we can leave it true. We'll use the default.
});

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ timestamp: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
