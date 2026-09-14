const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');

router.get('/', protect, authorize('admin', 'manager'), getExpenses);
router.post('/', protect, authorize('admin', 'manager'), createExpense);
router.delete('/:id', protect, authorize('admin'), deleteExpense);

module.exports = router;