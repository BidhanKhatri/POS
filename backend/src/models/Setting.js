import mongoose from 'mongoose';

// Singleton document keyed by the string '_id: "global"'.
// Use findByIdAndUpdate with upsert:true to read-modify-write safely.
const settingSchema = new mongoose.Schema({
  _id: { type: String },
  maxDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
