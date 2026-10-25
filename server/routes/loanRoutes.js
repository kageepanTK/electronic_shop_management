const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getLoans, getLoanSummary, getLoanById, createLoan, approveLoan, rejectLoan, activateLoan, recordPayment,
} = require('../controllers/loanController');

router.get('/', protect, getLoans);
router.get('/summary', protect, getLoanSummary); // must stay above '/:id'
router.get('/:id', protect, getLoanById);
router.post('/', protect, createLoan);
router.put('/:id/approve', protect, authorize('admin', 'manager'), approveLoan);
router.put('/:id/reject', protect, authorize('admin', 'manager'), rejectLoan);
router.post('/:id/activate', protect, activateLoan);
router.post('/:id/payments', protect, recordPayment);

module.exports = router;