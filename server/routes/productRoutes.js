const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  openBag,
  getStockHistory,
  restockProduct,
  removeProduct,
  getRemovedProducts,
  writeOffStock,
} = require('../controllers/productController');

router.get('/', protect, getProducts);
router.get('/removed', protect, authorize('admin'), getRemovedProducts); // must stay above '/:id'
router.get('/:id', protect, getProductById);
router.get('/:id/stock-history', protect, getStockHistory);
router.post('/', protect, authorize('admin', 'manager'), upload.single('image'), createProduct);
router.post('/:id/open-bag', protect, authorize('admin', 'manager'), openBag);
router.post('/:id/restock', protect, authorize('admin', 'manager'), restockProduct);
router.post('/:id/remove', protect, authorize('admin'), removeProduct);
router.post('/:id/write-off', protect, authorize('admin'), writeOffStock);
router.put('/:id', protect, authorize('admin', 'manager'), upload.single('image'), updateProduct);

module.exports = router;