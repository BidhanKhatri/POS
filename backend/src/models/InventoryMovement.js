import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  movementType: {
    type: String,
    enum: ['SALE', 'RESTOCK', 'ADJUSTMENT', 'VOID', 'REFUND'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  beforeQty: {
    type: Number,
    required: true,
  },
  afterQty: {
    type: Number,
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can refer to Sale, ManagerOverride, etc.
  },
  referenceType: {
    type: String,
    enum: ['Sale', 'Refund', 'Restock', 'Adjustment', 'Void'],
  },
  remarks: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

inventoryMovementSchema.index({ productId: 1 });
inventoryMovementSchema.index({ movementType: 1 });
inventoryMovementSchema.index({ createdAt: 1 });

export default mongoose.model('InventoryMovement', inventoryMovementSchema);
