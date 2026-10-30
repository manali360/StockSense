const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { checkAndTriggerStockAlert } = require('../services/alertService');

// @desc    Get inventory summary statistics
// @route   GET /api/inventory/summary
// @access  Private
const getInventorySummary = async (req, res, next) => {
  try {
    const summaryAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockUnits: { $sum: '$availableQuantity' },
          totalInventoryCost: {
            $sum: { $multiply: ['$availableQuantity', '$purchasePrice'] }
          },
          totalInventoryRetailValue: {
            $sum: { $multiply: ['$availableQuantity', '$sellingPrice'] }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$availableQuantity', 0] },
                    { $lte: ['$availableQuantity', '$minimumStockThreshold'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$availableQuantity', 0] }, 1, 0]
            }
          },
          inStockCount: {
            $sum: {
              $cond: [
                { $gt: ['$availableQuantity', '$minimumStockThreshold'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = summaryAgg[0] || {
      totalProducts: 0,
      totalStockUnits: 0,
      totalInventoryCost: 0,
      totalInventoryRetailValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inStockCount: 0
    };

    result.potentialProfit = (result.totalInventoryRetailValue || 0) - (result.totalInventoryCost || 0);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock quantity directly (Stock In, Stock Out, Adjustment)
// @route   PATCH /api/inventory/:id/stock
// @access  Private (Admin & Operator with permissions)
const updateStock = async (req, res, next) => {
  try {
    const { type, quantity, reason, referenceId } = req.body;
    const qtyChange = parseInt(quantity, 10);

    if (isNaN(qtyChange) || qtyChange < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid non-negative quantity'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason for stock modification is required for the audit trail'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousQuantity = product.availableQuantity;
    let newQuantity = previousQuantity;
    let movementType = 'ADJUSTMENT';
    let delta = 0;

    switch (type) {
      case 'ADD':
      case 'STOCK_IN':
        newQuantity = previousQuantity + qtyChange;
        movementType = 'STOCK_IN';
        delta = qtyChange;
        break;

      case 'REMOVE':
      case 'STOCK_OUT':
        if (qtyChange > previousQuantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot remove ${qtyChange} units. Only ${previousQuantity} units available.`
          });
        }
        newQuantity = previousQuantity - qtyChange;
        movementType = 'STOCK_OUT';
        delta = -qtyChange;
        break;

      case 'SET':
      case 'ADJUSTMENT':
        newQuantity = qtyChange;
        movementType = 'ADJUSTMENT';
        delta = newQuantity - previousQuantity;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid stock adjustment type. Use ADD, REMOVE, or SET.'
        });
    }

    product.availableQuantity = newQuantity;

    // Status auto-computation
    if (newQuantity === 0) {
      product.status = 'OUT_OF_STOCK';
    } else if (newQuantity <= product.minimumStockThreshold) {
      product.status = 'LOW_STOCK';
    } else {
      product.status = 'IN_STOCK';
    }

    await product.save();

    // Create Audit Log in StockMovement
    const movement = await StockMovement.create({
      product: product._id,
      sku: product.sku,
      productName: product.name,
      type: movementType,
      quantityChanged: delta,
      previousQuantity,
      newQuantity,
      reason: reason.trim(),
      referenceId: referenceId || 'MANUAL_ADJUSTMENT',
      updatedBy: req.user.id
    });

    // Check alerts
    await checkAndTriggerStockAlert(product);

    res.json({
      success: true,
      message: `Stock updated successfully for SKU ${product.sku}`,
      data: {
        product,
        movement
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock and out of stock products
// @route   GET /api/inventory/low-stock
// @access  Private
const getLowStockProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

    const products = await Product.find({
      $expr: { $lte: ['$availableQuantity', '$minimumStockThreshold'] }
    })
      .sort({ availableQuantity: 1 })
      .limit(limit);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stock movement audit history
// @route   GET /api/inventory/history
// @access  Private
const getStockHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const { type, search, startDate, endDate, productId } = req.query;

    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (type && type !== 'All') {
      query.type = type;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { sku: searchRegex },
        { productName: searchRegex },
        { reason: searchRegex },
        { referenceId: searchRegex }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await StockMovement.countDocuments(query);
    const history = await StockMovement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('updatedBy', 'name email role');

    res.json({
      success: true,
      data: history,
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

module.exports = {
  getInventorySummary,
  updateStock,
  getLowStockProducts,
  getStockHistory
};
