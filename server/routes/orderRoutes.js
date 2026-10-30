const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);

router.get('/', getOrders);
router.get('/:id', getOrderById);

router.post(
  '/',
  [
    body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item must be included')
  ],
  validate,
  createOrder
);

router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
      .withMessage('Valid status is required')
  ],
  validate,
  updateOrderStatus
);

module.exports = router;
