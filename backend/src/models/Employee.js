import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'Employee'],
    default: 'Employee',
  },
  pinHash: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

employeeSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pinHash);
};

// Hash PIN before saving
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('pinHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.pinHash = await bcrypt.hash(this.pinHash, salt);
});

export default mongoose.model('Employee', employeeSchema);
