const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

router.use(protect);

router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProductById);

router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('purchasePrice').isFloat({ min: 0 }).withMessage('Valid purchase price is required'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Valid selling price is required'),
    body('availableQuantity').isInt({ min: 0 }).withMessage('Available quantity must be non-negative')
  ],
  validate,
  createProduct
);

router.put(
  '/:id',
  authorize('admin'),
  updateProduct
);

router.delete(
  '/:id',
  authorize('admin'),
  deleteProduct
);

module.exports = router;
