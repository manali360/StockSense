const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'ORDER_DEDUCTION', 'ORDER_RESTORE'],
      required: true
    },
    quantityChanged: {
      type: Number,
      required: true
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    referenceId: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ sku: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
