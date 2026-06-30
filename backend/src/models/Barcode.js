import mongoose from 'mongoose';

const regenerationEntrySchema = new mongoose.Schema({
  oldValue: { type: String, required: true },
  regeneratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  regeneratedAt: { type: Date, default: Date.now },
}, { _id: false });

const barcodeSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true,
  },
  sku: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  barcodeValue: {
    type: String,
    required: true,
    unique: true,
  },
  barcodeType: {
    type: String,
    enum: ['CODE128'],
    default: 'CODE128',
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  printCount: {
    type: Number,
    default: 0,
  },
  lastPrintedAt: { type: Date },
  lastPrintedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  regenerationHistory: {
    type: [regenerationEntrySchema],
    default: [],
  },
}, { timestamps: true });

barcodeSchema.index({ barcodeValue: 1 }, { unique: true });
barcodeSchema.index({ productId: 1 }, { unique: true });
barcodeSchema.index({ sku: 1 });
barcodeSchema.index({ createdAt: -1 });

export default mongoose.model('Barcode', barcodeSchema);
