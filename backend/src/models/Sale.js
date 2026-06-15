import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discountTotal: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'VOIDED'],
    default: 'PENDING',
  },
}, {
  timestamps: true,
});

saleSchema.index({ shiftId: 1 });
saleSchema.index({ employeeId: 1 });
saleSchema.index({ createdAt: 1 });

export default mongoose.model('Sale', saleSchema);
