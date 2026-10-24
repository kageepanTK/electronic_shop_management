const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierStatus,
  deleteSupplier,
} = require('../controllers/supplierController');

router.get('/', protect, getSuppliers);
router.post('/', protect, authorize('admin', 'manager'), createSupplier);
router.put('/:id', protect, authorize('admin', 'manager'), updateSupplier);
router.put('/:id/status', protect, authorize('admin', 'manager'), setSupplierStatus);
router.delete('/:id', protect, authorize('admin'), deleteSupplier);

module.exports = router;