const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getCustomers, createCustomer } = require('../controllers/customerController');

router.get('/', protect, getCustomers);
router.post('/', protect, createCustomer);

module.exports = router;