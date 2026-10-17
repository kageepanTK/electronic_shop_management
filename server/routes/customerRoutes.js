const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getCustomers, createCustomer, setLoanEligibility } = require('../controllers/customerController');

router.get('/', protect, getCustomers);
router.post('/', protect, createCustomer);
router.put('/:id/loan-eligibility', protect, authorize('admin', 'manager'), setLoanEligibility);

module.exports = router;