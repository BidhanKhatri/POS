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
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    required: true,
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
