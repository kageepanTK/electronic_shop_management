const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCustomers, getCustomersOverview, getCustomerDetails,
  createCustomer, updateCustomer, setLoanEligibility,
} = require('../controllers/customerController');

router.get('/', protect, getCustomers);
router.get('/overview', protect, getCustomersOverview);
router.get('/:id/details', protect, getCustomerDetails);
router.post('/', protect, createCustomer);
router.put('/:id', protect, authorize('admin', 'manager'), updateCustomer);
router.put('/:id/loan-eligibility', protect, authorize('admin', 'manager'), setLoanEligibility);

module.exports = router;