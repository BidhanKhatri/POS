import mongoose from 'mongoose';

// Singleton document keyed by the string '_id: "global"'.
// Use findByIdAndUpdate with upsert:true to read-modify-write safely.
const settingSchema = new mongoose.Schema({
  _id: { type: String },
  maxDiscountPercent:      { type: Number, default: 10, min: 0, max: 100 },
  maxPriceVariancePercent: { type: Number, default: 10, min: 0, max: 100 },
  syncStaffingBetit:       { type: Boolean, default: false },
  stockTrackingEnabled:    { type: Boolean, default: true  },
  storeLogo: {
    url:      { type: String, default: null },
    fileId:   { type: String, default: null },
    fileName: { type: String, default: null },
  },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
