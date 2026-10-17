const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Loan, LoanItem, LoanInstallment, LoanPayment } = require('./../models/Loan');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const StockHistory = require('../models/StockHistory');
const User = require('../models/User');

// ---------- helpers ----------
const toCents = (v) => Math.round(parseFloat(v) * 100);
const fromCents = (c) => (c / 100).toFixed(2);

const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
const sendError = (res, err) => res.status(err.status || 500).json({ message: err.message });

const addMonths = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
};
const fmtDate = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD

// ACTIVE <-> OVERDUE based on unpaid installments past their due date
const refreshOverdue = async () => {
  const today = fmtDate(new Date());
  const rows = await LoanInstallment.findAll({
    attributes: ['loanId'],
    where: { status: { [Op.ne]: 'paid' }, dueDate: { [Op.lt]: today } },
    group: ['loanId'],
    raw: true,
  });
  const ids = rows.map((r) => r.loanId);

  if (ids.length > 0) {
    await Loan.update({ status: 'OVERDUE' }, { where: { status: 'ACTIVE', id: ids } });
    await Loan.update({ status: 'ACTIVE' }, { where: { status: 'OVERDUE', id: { [Op.notIn]: ids } } });
  } else {
    await Loan.update({ status: 'ACTIVE' }, { where: { status: 'OVERDUE' } });
  }
};

// ---------- GET /api/loans?status= ----------
exports.getLoans = async (req, res) => {
  try {
    await refreshOverdue();
    const where = {};
    if (req.query.status) where.status = req.query.status.toUpperCase();

    const loans = await Loan.findAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name', 'phone'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(loans);
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- GET /api/loans/:id ----------
exports.getLoanById = async (req, res) => {
  try {
    await refreshOverdue();
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone', 'email', 'address', 'dueAmount'] },
        { model: LoanItem, as: 'items', include: [{ model: Product, attributes: ['id', 'name'] }] },
        { model: LoanInstallment, as: 'installments' },
        { model: LoanPayment, as: 'payments', include: [{ model: User, as: 'receivedBy', attributes: ['name'] }] },
        { model: User, as: 'createdBy', attributes: ['name'] },
        { model: User, as: 'reviewedBy', attributes: ['name'] },
      ],
      order: [
        [{ model: LoanInstallment, as: 'installments' }, 'number', 'ASC'],
        [{ model: LoanPayment, as: 'payments' }, 'createdAt', 'DESC'],
      ],
    });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json(loan);
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- POST /api/loans  (create application -> PENDING) ----------
exports.createLoan = async (req, res) => {
  const t = await sequelize.transaction();
  let loanId;
  try {
    const { customerId, items, downPayment = 0, installmentCount } = req.body;
    const count = parseInt(installmentCount, 10);

    if (!customerId) fail(400, 'Customer is required');
    if (!Array.isArray(items) || items.length === 0) fail(400, 'Select at least one product');
    if (!Number.isInteger(count) || count < 1 || count > 60) fail(400, 'Installments must be between 1 and 60');

    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) fail(404, 'Customer not found');

    const down = toCents(downPayment);
    if (!Number.isFinite(down) || down < 0) fail(400, 'Invalid down payment');
    if (!customer.loanAllowed) fail(403, 'This customer is not approved for loans');

    let totalCents = 0;
    const lines = [];
    const seen = new Set();

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1) fail(400, 'Quantity must be a whole number of at least 1');
      if (seen.has(item.productId)) fail(400, 'Each product can only be added once');
      seen.add(item.productId);

      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) fail(404, `Product not found: ${item.productId}`);

      const price = toCents(product.sellingPrice); // server-side price only
      lines.push({
        productId: product.id,
        quantity: qty,
        unitPrice: fromCents(price),
        subtotal: fromCents(price * qty),
      });
      totalCents += price * qty;
    }

    if (down >= totalCents) fail(400, 'Down payment must be less than the total amount');
    const loanCents = totalCents - down;

    const loan = await Loan.create(
      {
        customerId,
        createdById: req.user.id,
        totalAmount: fromCents(totalCents),
        downPayment: fromCents(down),
        loanAmount: fromCents(loanCents),
        outstandingBalance: fromCents(loanCents),
        installmentCount: count,
        status: 'PENDING',
      },
      { transaction: t }
    );

    await LoanItem.bulkCreate(lines.map((l) => ({ ...l, loanId: loan.id })), { transaction: t });

    loanId = loan.id;
    await t.commit();
  } catch (err) {
    await t.rollback();
    return sendError(res, err);
  }
  res.status(201).json({ id: loanId, message: 'Loan application submitted and is pending approval' });
};

// ---------- PUT /api/loans/:id/approve  (admin only, enforced in route) ----------
exports.approveLoan = async (req, res) => {
  try {
    // Atomic: only a PENDING application can move to APPROVED
    const [updated] = await Loan.update(
      { status: 'APPROVED', reviewedById: req.user.id, reviewedAt: new Date(), rejectionReason: null },
      { where: { id: req.params.id, status: 'PENDING' } }
    );
    if (!updated) {
      const exists = await Loan.findByPk(req.params.id);
      if (!exists) fail(404, 'Loan not found');
      fail(400, `Only PENDING applications can be approved (current status: ${exists.status})`);
    }
    res.json({ message: 'Loan approved' });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- PUT /api/loans/:id/reject  (admin only, enforced in route) ----------
exports.rejectLoan = async (req, res) => {
  try {
    const reason = (req.body.reason || '').trim().slice(0, 255) || null;
    const [updated] = await Loan.update(
      { status: 'REJECTED', reviewedById: req.user.id, reviewedAt: new Date(), rejectionReason: reason },
      { where: { id: req.params.id, status: 'PENDING' } }
    );
    if (!updated) {
      const exists = await Loan.findByPk(req.params.id);
      if (!exists) fail(404, 'Loan not found');
      fail(400, `Only PENDING applications can be rejected (current status: ${exists.status})`);
    }
    res.json({ message: 'Loan rejected' });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- POST /api/loans/:id/activate  (loan-based POS checkout) ----------
exports.activateLoan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Row lock prevents two cashiers activating the same loan at once
    const loan = await Loan.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!loan) fail(404, 'Loan not found');
    if (loan.status !== 'APPROVED') {
      fail(400, `Only APPROVED loans can be used for checkout (current status: ${loan.status})`);
    }

    const customer = await Customer.findByPk(loan.customerId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!customer) fail(400, 'Customer no longer exists');

    const items = await LoanItem.findAll({ where: { loanId: loan.id }, transaction: t });

    // Re-check stock now and deduct it
    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) fail(400, 'A product in this loan no longer exists');
      if (product.stockQty < item.quantity) {
        fail(400, `Insufficient stock for ${product.name}. Available: ${product.stockQty}`);
      }
      product.stockQty -= item.quantity;
      await product.save({ transaction: t });

      await StockHistory.create(
        {
          productId: product.id,
          userId: req.user.id,
          type: 'bag_sale',
          quantity: -item.quantity,
          note: `Loan sale (Loan #${loan.id})`,
        },
        { transaction: t }
      );
    }

    // Create the sale using the existing Sale/SaleItem tables
    const downCents = toCents(loan.downPayment);
    const sale = await Sale.create(
      {
        customerId: customer.id,
        customerName: customer.name,
        userId: req.user.id,
        totalAmount: loan.totalAmount,
        discount: 0,
        paidAmount: loan.downPayment,
        paymentStatus: downCents > 0 ? 'partial' : 'unpaid',
        paymentMethod: 'credit',
      },
      { transaction: t }
    );

    await SaleItem.bulkCreate(
      items.map((i) => ({
        saleId: sale.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        saleType: 'bag',
      })),
      { transaction: t }
    );

    // Installment schedule (monthly, last one absorbs the rounding remainder)
    const loanCents = toCents(loan.loanAmount);
    const n = loan.installmentCount;
    const base = Math.floor(loanCents / n);
    const remainder = loanCents - base * n;
    const start = new Date();

    const installments = [];
    for (let i = 1; i <= n; i++) {
      installments.push({
        loanId: loan.id,
        number: i,
        dueDate: fmtDate(addMonths(start, i)),
        amount: fromCents(i === n ? base + remainder : base),
      });
    }
    await LoanInstallment.bulkCreate(installments, { transaction: t });

    // Same convention as existing credit sales: unpaid amount goes to customer.dueAmount
    customer.dueAmount = fromCents(toCents(customer.dueAmount) + loanCents);
    await customer.save({ transaction: t });

    await loan.update({ status: 'ACTIVE', activatedAt: new Date(), saleId: sale.id }, { transaction: t });

    await t.commit();
    res.json({ message: 'Loan activated and sale completed', saleId: sale.id });
  } catch (err) {
    await t.rollback();
    sendError(res, err);
  }
};

// ---------- POST /api/loans/:id/payments ----------
exports.recordPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const cents = toCents(req.body.amount);
    if (!Number.isFinite(cents) || cents <= 0) fail(400, 'Enter a valid payment amount');

    const loan = await Loan.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!loan) fail(404, 'Loan not found');
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      fail(400, `Payments can only be recorded on ACTIVE or OVERDUE loans (current status: ${loan.status})`);
    }

    const outstanding = toCents(loan.outstandingBalance);
    if (cents > outstanding) fail(400, `Payment exceeds the outstanding balance (${fromCents(outstanding)})`);

    // Apply to the oldest unpaid installments first
    const installments = await LoanInstallment.findAll({
      where: { loanId: loan.id, status: { [Op.ne]: 'paid' } },
      order: [['number', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let remaining = cents;
    for (const inst of installments) {
      if (remaining <= 0) break;
      const instAmount = toCents(inst.amount);
      const alreadyPaid = toCents(inst.paidAmount);
      const pay = Math.min(instAmount - alreadyPaid, remaining);
      const newPaid = alreadyPaid + pay;

      inst.paidAmount = fromCents(newPaid);
      inst.status = newPaid >= instAmount ? 'paid' : 'partial';
      await inst.save({ transaction: t });
      remaining -= pay;
    }

    await LoanPayment.create(
      {
        loanId: loan.id,
        amount: fromCents(cents),
        note: (req.body.note || '').trim().slice(0, 255) || null,
        receivedById: req.user.id,
      },
      { transaction: t }
    );

    const newOutstanding = outstanding - cents;
    await loan.update(
      {
        outstandingBalance: fromCents(newOutstanding),
        status: newOutstanding === 0 ? 'PAID' : loan.status,
      },
      { transaction: t }
    );

    const customer = await Customer.findByPk(loan.customerId, { transaction: t, lock: t.LOCK.UPDATE });
    if (customer) {
      customer.dueAmount = fromCents(Math.max(0, toCents(customer.dueAmount) - cents));
      await customer.save({ transaction: t });
    }

    await t.commit();
    res.json({ message: newOutstanding === 0 ? 'Loan fully paid' : 'Payment recorded' });
  } catch (err) {
    await t.rollback();
    sendError(res, err);
  }
};