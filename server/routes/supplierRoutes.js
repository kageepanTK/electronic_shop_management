const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getSuppliers, createSupplier, deleteSupplier } = require('../controllers/supplierController');

router.get('/', protect, getSuppliers);
router.post('/', protect, authorize('admin', 'manager'), createSupplier);
router.delete('/:id', protect, authorize('admin'), deleteSupplier);

module.exports = router;