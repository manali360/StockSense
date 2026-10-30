const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { checkAndTriggerStockAlert } = require('../services/alertService');

// @desc    Get all products with pagination, search, filters & sort
// @route   GET /api/products
// @access  Private (Admin & Operator)
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, category, status, sortBy, order, minPrice, maxPrice } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { brand: searchRegex },
        { description: searchRegex }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get recent stock movements for this product
    const recentMovements = await StockMovement.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('updatedBy', 'name');

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        recentMovements
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin only)
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      description,
      category,
      brand,
      purchasePrice,
      sellingPrice,
      availableQuantity,
      minimumStockThreshold,
      supplierName,
      warehouseLocation,
      imageUrl
    } = req.body;

    const formattedSku = (sku || '').trim().toUpperCase();

    const existingSku = await Product.findOne({ sku: formattedSku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `Product with SKU "${formattedSku}" already exists`
      });
    }

    const initialQuantity = parseInt(availableQuantity, 10) || 0;
    const threshold = parseInt(minimumStockThreshold, 10) >= 0 ? parseInt(minimumStockThreshold, 10) : 10;

    let initialStatus = 'IN_STOCK';
    if (initialQuantity === 0) {
      initialStatus = 'OUT_OF_STOCK';
    } else if (initialQuantity <= threshold) {
      initialStatus = 'LOW_STOCK';
    }

    const product = await Product.create({
      name: name.trim(),
      sku: formattedSku,
      description: description ? description.trim() : '',
      category: category ? category.trim() : 'General',
      brand: brand ? brand.trim() : 'Generic',
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      availableQuantity: initialQuantity,
      minimumStockThreshold: threshold,
      supplierName: supplierName ? supplierName.trim() : 'Primary Supplier',
      warehouseLocation: warehouseLocation ? warehouseLocation.trim() : 'Zone A',
      imageUrl: imageUrl || '',
      status: initialStatus,
      createdBy: req.user.id
    });

    // Record initial stock movement audit log if initial quantity > 0
    if (initialQuantity > 0) {
      await StockMovement.create({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'STOCK_IN',
        quantityChanged: initialQuantity,
        previousQuantity: 0,
        newQuantity: initialQuantity,
        reason: 'Initial inventory intake',
        referenceId: 'INITIAL_STOCK',
        updatedBy: req.user.id
      });
    }

    // Trigger stock alert check
    await checkAndTriggerStockAlert(product);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const {
      name,
      sku,
      description,
      category,
      brand,
      purchasePrice,
      sellingPrice,
      minimumStockThreshold,
      supplierName,
      warehouseLocation,
      imageUrl
    } = req.body;

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const existing = await Product.findOne({
        sku: sku.trim().toUpperCase(),
        _id: { $ne: product._id }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `SKU "${sku.trim().toUpperCase()}" is already assigned to another product`
        });
      }
      product.sku = sku.trim().toUpperCase();
    }

    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (category) product.category = category.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (purchasePrice !== undefined) product.purchasePrice = parseFloat(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = parseFloat(sellingPrice);
    if (minimumStockThreshold !== undefined) {
      product.minimumStockThreshold = parseInt(minimumStockThreshold, 10);
    }
    if (supplierName !== undefined) product.supplierName = supplierName.trim();
    if (warehouseLocation !== undefined) product.warehouseLocation = warehouseLocation.trim();
    if (imageUrl !== undefined) product.imageUrl = imageUrl.trim();

    // Re-evaluate status
    if (product.availableQuantity === 0) {
      product.status = 'OUT_OF_STOCK';
    } else if (product.availableQuantity <= product.minimumStockThreshold) {
      product.status = 'LOW_STOCK';
    } else {
      product.status = 'IN_STOCK';
    }

    await product.save();

    // Trigger stock alert evaluation
    await checkAndTriggerStockAlert(product);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is part of active (non-cancelled) orders
    const activeOrder = await Order.findOne({
      'items.product': product._id,
      status: { $in: ['PENDING', 'PROCESSING'] }
    });

    if (activeOrder) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product "${product.name}" because it is part of active order #${activeOrder.orderNumber}`
      });
    }

    // Clean up notifications for this product
    await Notification.deleteMany({ product: product._id });

    await product.deleteOne();

    res.json({
      success: true,
      message: `Product "${product.name}" deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all distinct categories
// @route   GET /api/products/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    res.json({
      success: true,
      data: categories.filter(Boolean).sort()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};
