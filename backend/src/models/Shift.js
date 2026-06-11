import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
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
    // Store just the date portion
    set: function(date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      return d;
    }
  },
}, {
  timestamps: true,
});

// Indexes based on Database_Agent.md
shiftSchema.index({ employeeId: 1, shiftDate: 1 });
shiftSchema.index({ status: 1 });

export default mongoose.model('Shift', shiftSchema);
