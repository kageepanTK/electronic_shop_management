const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { receiptUpload } = require('../middleware/receiptUpload');
const {
  getExpenses, getExpenseSummary, getExpenseById, getReceipt,
  createExpense, updateExpense, deleteExpense,
} = require('../controllers/expenseController');

const reviewers = [protect, authorize('admin', 'manager')];

router.get('/', ...reviewers, getExpenses);
router.get('/summary', ...reviewers, getExpenseSummary); // must stay above '/:id'
router.get('/:id', ...reviewers, getExpenseById);
router.get('/:id/receipt', ...reviewers, getReceipt);
router.post('/', ...reviewers, receiptUpload, createExpense);
router.put('/:id', ...reviewers, receiptUpload, updateExpense);
router.delete('/:id', protect, authorize('admin'), deleteExpense);

module.exports = router;