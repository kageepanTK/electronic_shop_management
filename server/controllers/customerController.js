const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { Loan, LoanPayment } = require('../models/Loan');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{5,30}$/;

const toCents = (v) => Math.round(Number(v) * 100);
const fromCents = (c) => (c / 100).toFixed(2);
const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const ORDERS = {
  balance_desc: [['dueAmount', 'DESC'], ['name', 'ASC']],
  balance_asc: [['dueAmount', 'ASC'], ['name', 'ASC']],
  name: [['name', 'ASC']],
  newest: [['createdAt', 'DESC']],
};

// Matches name, phone, or Customer ID ("7" or "C-0007")
const searchCondition = (raw) => {
  const term = String(raw || '').trim().slice(0, 100);
  if (!term) return null;
  const or = [{ name: { [Op.like]: `%${term}%` } }, { phone: { [Op.like]: `%${term}%` } }];
  if (/^(c-?)?\d+$/i.test(term)) or.push({ id: parseInt(term.replace(/\D/g, ''), 10) });
  return { [Op.or]: or };
};

// Customers with an unpaid installment past its due date on an open loan
const getOverdueCustomerIds = async () => {
  const rows = await sequelize.query(
    `SELECT DISTINCT l.customerId
       FROM LoanInstallments i
       JOIN Loans l ON l.id = i.loanId
      WHERE i.status <> 'paid' AND i.dueDate < :today AND l.status IN ('ACTIVE', 'OVERDUE')`,
    { replacements: { today: todayStr() }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.customerId);
};

// Validates the body for create and update
const parseFields = (body, allowLimit) => {
  const name = clean(body.name, 150);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 100);
  const address = clean(body.address, 255);

  if (!name) return { error: 'Customer name is required' };
  if (phone && !PHONE_RE.test(phone)) return { error: 'Enter a valid phone number' };
  if (email && !EMAIL_RE.test(email)) return { error: 'Enter a valid email address' };

  let loanLimit; // undefined = leave unchanged
  if (allowLimit && body.loanLimit !== undefined) {
    if (body.loanLimit === null || body.loanLimit === '') {
      loanLimit = null;
    } else {
      const n = Number(body.loanLimit);
      if (!Number.isFinite(n) || n < 0 || n > 99999999.99) return { error: 'Enter a valid loan limit' };
      loanLimit = fromCents(Math.round(n * 100));
    }
  }
  return { name, phone: phone || null, email: email || null, address: address || null, loanLimit };
};

const isReviewer = (req) => ['admin', 'manager'].includes(req.user.role);

// ---------- GET /api/customers?search=   (used by New Sale and New Loan) ----------
exports.getCustomers = async (req, res) => {
  try {
    const cond = searchCondition(req.query.search);
    const customers = await Customer.findAll({
      where: cond || {},
      order: [['name', 'ASC']],
      limit: 50,
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- GET /api/customers/overview?search&balance&credit&sort&page&pageSize ----------
exports.getCustomersOverview = async (req, res) => {
  try {
    const q = req.query;
    const pageSize = [5, 10, 25, 50].includes(parseInt(q.pageSize, 10)) ? parseInt(q.pageSize, 10) : 10;
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const balance = ['all', 'with', 'none', 'overdue'].includes(q.balance) ? q.balance : 'all';
    const credit = ['all', 'enabled', 'disabled'].includes(q.credit) ? q.credit : 'all';
    const sortKey = Object.keys(ORDERS).includes(q.sort) ? q.sort : 'balance_desc';

    const overdueIds = await getOverdueCustomerIds();

    const and = [];
    const search = searchCondition(q.search);
    if (search) and.push(search);
    if (balance === 'with') and.push({ dueAmount: { [Op.gt]: 0 } });
    if (balance === 'none') and.push({ dueAmount: { [Op.lte]: 0 } });
    if (balance === 'overdue') and.push({ id: overdueIds.length ? { [Op.in]: overdueIds } : 0 });
    if (credit !== 'all') and.push({ loanAllowed: credit === 'enabled' });
    const where = and.length ? { [Op.and]: and } : {};

    const [found, total, withBalance, creditEnabled, dueRows] = await Promise.all([
      Customer.findAndCountAll({ where, order: ORDERS[sortKey], limit: pageSize, offset: (page - 1) * pageSize }),
      Customer.count(),
      Customer.count({ where: { dueAmount: { [Op.gt]: 0 } } }),
      Customer.count({ where: { loanAllowed: true } }),
      sequelize.query('SELECT COALESCE(SUM(dueAmount), 0) AS total FROM Customers WHERE dueAmount > 0', {
        type: QueryTypes.SELECT,
      }),
    ]);

    // last activity (sale, loan application or loan repayment) for the customers on this page
    const ids = found.rows.map((c) => c.id);
    const activity = new Map();
    if (ids.length) {
      const acts = await sequelize.query(
        `SELECT customerId, kind, MAX(happenedAt) AS happenedAt FROM (
            SELECT customerId, 'Sale' AS kind, createdAt AS happenedAt
              FROM Sales WHERE customerId IN (:ids)
            UNION ALL
            SELECT customerId, 'Loan application' AS kind, createdAt AS happenedAt
              FROM Loans WHERE customerId IN (:ids)
            UNION ALL
            SELECT l.customerId, 'Payment received' AS kind, p.createdAt AS happenedAt
              FROM LoanPayments p JOIN Loans l ON l.id = p.loanId WHERE l.customerId IN (:ids)
         ) x GROUP BY customerId, kind`,
        { replacements: { ids }, type: QueryTypes.SELECT }
      );
      for (const a of acts) {
        const prev = activity.get(a.customerId);
        if (!prev || new Date(a.happenedAt) > new Date(prev.at)) {
          activity.set(a.customerId, { at: a.happenedAt, kind: a.kind });
        }
      }
    }

    const overdueSet = new Set(overdueIds);
    const rows = found.rows.map((c) => {
      const due = toCents(c.dueAmount);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        dueAmount: c.dueAmount,
        loanAllowed: c.loanAllowed,
        loanLimit: c.loanLimit,
        createdAt: c.createdAt,
        balanceStatus: overdueSet.has(c.id) ? 'overdue' : due > 0 ? 'due' : 'none',
        lastActivity: activity.get(c.id) || null,
      };
    });

    res.json({
      rows,
      total: found.count,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(found.count / pageSize)),
      stats: {
        totalCustomers: total,
        withBalance,
        totalDue: fromCents(toCents(dueRows[0].total)),
        loansEnabled: creditEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- GET /api/customers/:id/details ----------
exports.getCustomerDetails = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const [loans, payments, reserved, overdueIds] = await Promise.all([
      Loan.findAll({
        where: { customerId: customer.id },
        attributes: ['id', 'totalAmount', 'loanAmount', 'outstandingBalance', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      LoanPayment.findAll({
        include: [
          { model: Loan, attributes: ['id'], where: { customerId: customer.id }, required: true },
          { model: User, as: 'receivedBy', attributes: ['name'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      Loan.findAll({
        attributes: ['loanAmount'],
        where: { customerId: customer.id, status: ['PENDING', 'APPROVED'] },
        raw: true,
      }),
      getOverdueCustomerIds(),
    ]);

    const dueCents = toCents(customer.dueAmount);
    const reservedCents = reserved.reduce((s, l) => s + toCents(l.loanAmount), 0);
    const limitCents =
      customer.loanLimit === null || customer.loanLimit === undefined ? null : toCents(customer.loanLimit);

    res.json({
      customer: customer.toJSON(),
      overdue: overdueIds.includes(customer.id),
      credit: {
        limit: limitCents === null ? null : fromCents(limitCents),
        outstanding: fromCents(dueCents),
        reserved: fromCents(reservedCents), // applications still waiting for approval or checkout
        available: limitCents === null ? null : fromCents(Math.max(0, limitCents - dueCents - reservedCents)),
      },
      loans,
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- POST /api/customers ----------
exports.createCustomer = async (req, res) => {
  try {
    const f = parseFields(req.body, isReviewer(req));
    if (f.error) return res.status(400).json({ message: f.error });

    const data = { name: f.name, phone: f.phone, email: f.email, address: f.address };
    if (f.loanLimit !== undefined) data.loanLimit = f.loanLimit;

    const customer = await Customer.create(data);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- PUT /api/customers/:id   (admin / manager) ----------
exports.updateCustomer = async (req, res) => {
  try {
    const f = parseFields(req.body, true);
    if (f.error) return res.status(400).json({ message: f.error });

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const data = { name: f.name, phone: f.phone, email: f.email, address: f.address };
    if (f.loanLimit !== undefined) data.loanLimit = f.loanLimit;

    await customer.update(data);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- PUT /api/customers/:id/loan-eligibility   (admin / manager) ----------
exports.setLoanEligibility = async (req, res) => {
  try {
    if (typeof req.body.loanAllowed !== 'boolean') {
      return res.status(400).json({ message: 'loanAllowed must be true or false' });
    }
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.loanAllowed = req.body.loanAllowed;
    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};