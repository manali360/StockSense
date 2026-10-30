const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getInventorySummary,
  updateStock,
  getLowStockProducts,
  getStockHistory
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);

router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockProducts);
router.get('/history', getStockHistory);

router.patch(
  '/:id/stock',
  [
    body('type').isIn(['ADD', 'REMOVE', 'SET', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']).withMessage('Valid adjustment type is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer or zero'),
    body('reason').trim().notEmpty().withMessage('Reason for change is required')
  ],
  validate,
  updateStock
);

module.exports = router;
