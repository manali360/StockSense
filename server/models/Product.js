const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters']
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, 'SKU cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    brand: {
      type: String,
      trim: true,
      default: 'Generic'
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    minimumStockThreshold: {
      type: Number,
      required: [true, 'Minimum stock threshold is required'],
      min: [0, 'Threshold cannot be negative'],
      default: 10
    },
    supplierName: {
      type: String,
      trim: true,
      default: 'Primary Supplier'
    },
    warehouseLocation: {
      type: String,
      trim: true,
      default: 'Zone A - General'
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
      default: 'IN_STOCK'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

productSchema.pre('save', function (next) {
  if (this.availableQuantity === 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (this.availableQuantity <= this.minimumStockThreshold) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'IN_STOCK';
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ availableQuantity: 1 });

module.exports = mongoose.model('Product', productSchema);
