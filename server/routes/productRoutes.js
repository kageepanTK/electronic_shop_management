const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  openBag,
  getStockHistory,
  restockProduct,
} = require('../controllers/productController');

router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);
router.get('/:id/stock-history', protect, getStockHistory);
router.post('/', protect, authorize('admin', 'manager'), upload.single('image'), createProduct);
router.post('/:id/open-bag', protect, authorize('admin', 'manager'), openBag);
router.post('/:id/restock', protect, authorize('admin', 'manager'), restockProduct);
router.put('/:id', protect, authorize('admin', 'manager'), upload.single('image'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;