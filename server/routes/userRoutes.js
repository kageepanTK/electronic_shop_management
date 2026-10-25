const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getUsers, createUser, updateUserRole, updateSalary, getPayroll,
  markPaid, undoPayment, getPaymentHistory, deleteUser,
} = require('../controllers/userController');

const adminOnly = [protect, authorize('admin')];

router.get('/', ...adminOnly, getUsers);
router.get('/payroll', ...adminOnly, getPayroll);
router.get('/payments', ...adminOnly, getPaymentHistory);
router.post('/', ...adminOnly, createUser);
router.put('/:id/role', ...adminOnly, updateUserRole);
router.put('/:id/salary', ...adminOnly, updateSalary);
router.post('/:id/payments', ...adminOnly, markPaid);
router.delete('/payments/:paymentId', ...adminOnly, undoPayment);
router.delete('/:id', ...adminOnly, deleteUser);

module.exports = router;