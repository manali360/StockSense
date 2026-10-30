const Notification = require('../models/Notification');

/**
 * Evaluates product stock and manages notifications without duplicates
 * @param {Object} product Mongoose document or plain product object
 */
const checkAndTriggerStockAlert = async (product) => {
  try {
    const { _id, name, sku, availableQuantity, minimumStockThreshold } = product;

    if (availableQuantity === 0) {
      // Mark any LOW_STOCK unresolved notification as superseded
      await Notification.updateMany(
        { product: _id, type: 'LOW_STOCK', resolved: false },
        { resolved: true }
      );

      // Check if OUT_OF_STOCK alert already exists unresolved
      const existingOutAlert = await Notification.findOne({
        product: _id,
        type: 'OUT_OF_STOCK',
        resolved: false
      });

      if (!existingOutAlert) {
        await Notification.create({
          title: `Out of Stock: ${name}`,
          message: `SKU [${sku}] "${name}" is completely out of stock (0 units remaining). Immediate reorder required.`,
          type: 'OUT_OF_STOCK',
          priority: 'CRITICAL',
          product: _id,
          sku
        });
      }
    } else if (availableQuantity <= minimumStockThreshold) {
      // Out of stock is no longer true, resolve it if existed
      await Notification.updateMany(
        { product: _id, type: 'OUT_OF_STOCK', resolved: false },
        { resolved: true }
      );

      // Check if LOW_STOCK alert already exists unresolved
      const existingLowAlert = await Notification.findOne({
        product: _id,
        type: 'LOW_STOCK',
        resolved: false
      });

      if (!existingLowAlert) {
        await Notification.create({
          title: `Low Stock Alert: ${name}`,
          message: `SKU [${sku}] "${name}" has reached ${availableQuantity} units (threshold: ${minimumStockThreshold}).`,
          type: 'LOW_STOCK',
          priority: 'HIGH',
          product: _id,
          sku
        });
      }
    } else {
      // Sufficient stock: automatically resolve any pending alerts
      await Notification.updateMany(
        { product: _id, type: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] }, resolved: false },
        { resolved: true }
      );
    }
  } catch (error) {
    console.error('Error triggering stock alert:', error.message);
  }
};

module.exports = { checkAndTriggerStockAlert };
