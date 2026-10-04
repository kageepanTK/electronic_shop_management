const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');
const { openBag, getStockHistory } = require('../controllers/productController');

router.get('/', protect, getProducts);
router.get('/:id', protect, getProductById);
router.post('/', protect, authorize('admin', 'manager'), upload.single('image'), createProduct);
router.put('/:id', protect, authorize('admin', 'manager'), upload.single('image'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.post('/:id/open-bag', protect, authorize('admin', 'manager'), openBag);
router.get('/:id/stock-history', protect, getStockHistory);

module.exports = router;