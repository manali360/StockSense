const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getInventoryAnalytics,
  getTopProducts
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/top-products', getTopProducts);

module.exports = router;
