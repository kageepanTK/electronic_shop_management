const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createSale, getSales, getSaleById } = require('../controllers/saleController');

router.get('/', protect, getSales);
router.get('/:id', protect, getSaleById);
router.post('/', protect, createSale);

module.exports = router;