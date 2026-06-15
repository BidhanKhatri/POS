import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema({
  reportDate: {
    type: Date,
    required: true,
    unique: true,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalRefunds: {
    type: Number,
    default: 0,
  },
  transactionCount: {
    type: Number,
    default: 0,
  },
  paymentBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    // e.g. { CASH: 5000, CARD: 2000 }
    default: {},
  },
  employeePerformance: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    totalSales: Number,
    transactionCount: Number,
  }],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

dailyReportSchema.index({ reportDate: 1 }, { unique: true });

export default mongoose.model('DailyReport', dailyReportSchema);
