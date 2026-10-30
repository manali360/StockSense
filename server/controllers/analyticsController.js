const Product = require('../models/Product');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');

// @desc    Get comprehensive dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    // 1. Inventory Summary Aggregation
    const inventoryAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockUnits: { $sum: '$availableQuantity' },
          totalValuationCost: {
            $sum: { $multiply: ['$availableQuantity', '$purchasePrice'] }
          },
          totalValuationRetail: {
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

    const summary = inventoryAgg[0] || {
      totalProducts: 0,
      totalStockUnits: 0,
      totalValuationCost: 0,
      totalValuationRetail: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inStockCount: 0
    };

    // 2. Orders Summary Aggregation
    const orderAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CANCELLED'] }, '$totalAmount', 0]
            }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'PROCESSING'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          }
        }
      }
    ]);

    const ordersSummary = orderAgg[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    // 3. Category Distribution
    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$availableQuantity' },
          totalValue: {
            $sum: { $multiply: ['$availableQuantity', '$sellingPrice'] }
          }
        }
      },
      { $sort: { totalStock: -1 } }
    ]);

    // 4. Stock-in vs Stock-out trends (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const stockMovementsTrends = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$type'
          },
          totalQuantity: { $sum: { $abs: '$quantityChanged' } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Monthly Orders & Revenue Trend
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $ne: 'CANCELLED' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          ordersCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 6. Top Selling Products
    const topSelling = await Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          name: { $first: '$items.name' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 5 }
    ]);

    // 7. Recent Activities & Recent Orders
    const recentMovements = await StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('updatedBy', 'name role');

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(6);

    // 8. Low Stock alerts quick preview
    const lowStockPreview = await Product.find({
      $expr: { $lte: ['$availableQuantity', '$minimumStockThreshold'] }
    })
      .sort({ availableQuantity: 1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          ...summary,
          ...ordersSummary,
          potentialProfit: (summary.totalValuationRetail || 0) - (summary.totalValuationCost || 0)
        },
        categoryDistribution,
        stockMovementsTrends,
        monthlyOrders,
        topSelling,
        recentMovements,
        recentOrders,
        lowStockPreview
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed inventory analytics & reports
// @route   GET /api/analytics/inventory
// @access  Private
const getInventoryAnalytics = async (req, res, next) => {
  try {
    // Category Breakdown
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalUnits: { $sum: '$availableQuantity' },
          totalCost: { $sum: { $multiply: ['$availableQuantity', '$purchasePrice'] } },
          totalRetail: { $sum: { $multiply: ['$availableQuantity', '$sellingPrice'] } },
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
            $sum: { $cond: [{ $eq: ['$availableQuantity', 0] }, 1, 0] }
          }
        }
      },
      { $sort: { totalRetail: -1 } }
    ]);

    // Warehouse Location Breakdown
    const locationStats = await Product.aggregate([
      {
        $group: {
          _id: '$warehouseLocation',
          itemCount: { $sum: 1 },
          unitCount: { $sum: '$availableQuantity' }
        }
      },
      { $sort: { unitCount: -1 } }
    ]);

    // Slow moving / Dead stock detection (products with 0 sales or highest stock with zero movement)
    const productsWithOrders = await Order.distinct('items.sku', { status: { $ne: 'CANCELLED' } });
    const slowMovingProducts = await Product.find({
      sku: { $nin: productsWithOrders },
      availableQuantity: { $gt: 0 }
    })
      .sort({ availableQuantity: -1 })
      .limit(10);

    // Urgent replenishment items
    const replenishmentNeeded = await Product.find({
      $expr: { $lte: ['$availableQuantity', '$minimumStockThreshold'] }
    })
      .sort({ availableQuantity: 1 })
      .limit(15);

    res.json({
      success: true,
      data: {
        categoryStats,
        locationStats,
        slowMovingProducts,
        replenishmentNeeded
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top selling products
// @route   GET /api/analytics/top-products
// @access  Private
const getTopProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          name: { $first: '$items.name' },
          productId: { $first: '$items.product' },
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getInventoryAnalytics,
  getTopProducts
};
