import mongoose from 'mongoose';

const posScheduleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    title: {
      type: String,
      default: 'Regular Shift',
      trim: true,
      maxlength: 80,
    },
    color: {
      type: String,
      default: '#3E2723',
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// compound index for the most common query pattern
posScheduleSchema.index({ date: 1, employeeId: 1 });

export default mongoose.model('PosSchedule', posScheduleSchema);
