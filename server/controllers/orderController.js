const Order = require('../models/Order');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { checkAndTriggerStockAlert } = require('../services/alertService');

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
};

// @desc    Create a new order & deduct inventory
// @route   POST /api/orders
// @access  Private (Admin & Operator)
const createOrder = async (req, res, next) => {
  try {
    const { customer, items, notes } = req.body;

    if (!customer || !customer.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item is required to place an order'
      });
    }

    // Step 1: Validate stock sufficiency for all items BEFORE making changes
    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId || item.product} was not found`
        });
      }

      const reqQty = parseInt(item.quantity, 10);
      if (isNaN(reqQty) || reqQty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product "${product.name}"`
        });
      }

      if (product.availableQuantity < reqQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Requested: ${reqQty}, Available: ${product.availableQuantity}`
        });
      }

      const unitPrice = parseFloat(item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice);
      const subtotal = unitPrice * reqQty;
      calculatedTotal += subtotal;

      validatedItems.push({
        productDoc: product,
        product: product._id,
        sku: product.sku,
        name: product.name,
        unitPrice,
        quantity: reqQty,
        subtotal
      });
    }

    // Step 2: Generate order identifier
    let orderNumber = generateOrderNumber();
    let isUnique = false;
    while (!isUnique) {
      const exists = await Order.findOne({ orderNumber });
      if (!exists) {
        isUnique = true;
      } else {
        orderNumber = generateOrderNumber();
      }
    }

    // Step 3: Deduct inventory and record stock movements
    for (const item of validatedItems) {
      const product = item.productDoc;
      const prevQty = product.availableQuantity;
      const newQty = prevQty - item.quantity;

      product.availableQuantity = newQty;
      if (newQty === 0) {
        product.status = 'OUT_OF_STOCK';
      } else if (newQty <= product.minimumStockThreshold) {
        product.status = 'LOW_STOCK';
      } else {
        product.status = 'IN_STOCK';
      }

      await product.save();

      await StockMovement.create({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'ORDER_DEDUCTION',
        quantityChanged: -item.quantity,
        previousQuantity: prevQty,
        newQuantity: newQty,
        reason: `Deducted for Order #${orderNumber}`,
        referenceId: orderNumber,
        updatedBy: req.user.id
      });

      // Stock alert trigger
      await checkAndTriggerStockAlert(product);
    }

    // Step 4: Create order
    const order = await Order.create({
      orderNumber,
      customer: {
        name: customer.name.trim(),
        email: (customer.email || '').trim(),
        phone: (customer.phone || '').trim(),
        address: (customer.address || '').trim(),
        company: (customer.company || '').trim()
      },
      items: validatedItems.map(({ product, sku, name, unitPrice, quantity, subtotal }) => ({
        product,
        sku,
        name,
        unitPrice,
        quantity,
        subtotal
      })),
      totalAmount: calculatedTotal,
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      notes: notes || '',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: `Order #${orderNumber} created successfully`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders with pagination & filters
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { status, search, startDate, endDate } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'customer.phone': searchRegex },
        { 'items.sku': searchRegex },
        { 'items.name': searchRegex }
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

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: orders,
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

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku category imageUrl warehouseLocation');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (with inventory restoration if cancelled)
// @route   PATCH /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;

    if (previousStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled orders cannot be reopened or modified'
      });
    }

    // If changing to CANCELLED, restore product quantities!
    if (status === 'CANCELLED' && previousStatus !== 'CANCELLED') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const prevQty = product.availableQuantity;
          const newQty = prevQty + item.quantity;
          product.availableQuantity = newQty;

          if (newQty === 0) {
            product.status = 'OUT_OF_STOCK';
          } else if (newQty <= product.minimumStockThreshold) {
            product.status = 'LOW_STOCK';
          } else {
            product.status = 'IN_STOCK';
          }

          await product.save();

          await StockMovement.create({
            product: product._id,
            sku: product.sku,
            productName: product.name,
            type: 'ORDER_RESTORE',
            quantityChanged: item.quantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: `Restored inventory from cancelled Order #${order.orderNumber}`,
            referenceId: order.orderNumber,
            updatedBy: req.user.id
          });

          await checkAndTriggerStockAlert(product);
        }
      }
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order #${order.orderNumber} status updated to ${status}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
