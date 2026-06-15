import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
  },
  price: {
    type: Number,
    required: true,
  },
  costPrice: {
    type: Number,
    required: true,
  },
  stockQty: {
    type: Number,
    required: true,
    default: 0,
  },
  quickSlot: {
    type: Number,
    // E.g., 1-9 for POS quick buttons P1-P9
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes based on Database_Agent.md
productSchema.index({ quickSlot: 1 });

export default mongoose.model('Product', productSchema);
