import mongoose from 'mongoose';

// Metadata for a point-in-time export of one Database Management module.
// The actual compressed document dump lives in GridFS (bucket: 'db_backups'),
// referenced here by gridFsFileId — this doc is just the searchable record.
const databaseBackupSchema = new mongoose.Schema({
  module: { type: String, required: true },
  label:  { type: String, required: true },

  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },

  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
    default: 'IN_PROGRESS',
  },

  recordCount: { type: Number, default: 0 },
  sizeBytes:   { type: Number, default: 0 },

  gridFsFileId:   { type: mongoose.Schema.Types.ObjectId },
  gridFsFilename: { type: String },

  // Set once this backup was consumed by a delete action, so the audit trail
  // and backup history both point at the same record.
  reason: { type: String, enum: ['MANUAL', 'PRE_DELETE'], default: 'MANUAL' },

  restoreStatus: {
    type: String,
    enum: ['NEVER_RESTORED', 'RESTORED', 'RESTORE_FAILED'],
    default: 'NEVER_RESTORED',
  },
  restoredAt: { type: Date },
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  errorMessage: { type: String },
}, { timestamps: true });

databaseBackupSchema.index({ module: 1, createdAt: -1 });

export default mongoose.model('DatabaseBackup', databaseBackupSchema);
