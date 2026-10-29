const fs = require('fs');
const path = require('path');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const Expense = require('../models/Expense');
const ExpenseLog = require('../models/ExpenseLog');
const User = require('../models/User');
const { RECEIPT_DIR, TYPE_BY_EXT } = require('../middleware/receiptUpload');

// Keep these lists in sync with the frontend
const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Transport', 'Salary', 'Other'];
const METHODS = ['cash', 'card', 'bank_transfer', 'other'];
const SORTS = {
  date_desc: [['expenseDate', 'DESC'], ['id', 'DESC']],
  date_asc: [['expenseDate', 'ASC'], ['id', 'ASC']],
  amount_desc: [['amount', 'DESC'], ['id', 'DESC']],
  amount_asc: [['amount', 'ASC'], ['id', 'ASC']],
};

const toCents = (v) => Math.round(parseFloat(v) * 100);
const fromCents = (c) => (c / 100).toFixed(2);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const idOf = (req) => {
  const n = parseInt(req.params.id, 10);
  return Number.isInteger(n) ? n : null;
};
const normCategory = (c) =>
  CATEGORIES.find((x) => x.toLowerCase() === String(c || '').toLowerCase()) || 'Other';

const isValidDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && ymd(d) === s;
};

const removeFile = (name) => {
  if (!name) return;
  fs.unlink(path.join(RECEIPT_DIR, path.basename(name)), () => {}); // best effort
};

// Never expose the stored file name
const toJson = (e) => {
  const json = e.toJSON();
  json.hasReceipt = !!json.receiptFile;
  delete json.receiptFile;
  return json;
};

const describe = (e) =>
  `${e.title} | ${e.amount} | ${e.category} | ${e.expenseDate}`.slice(0, 500);

const parseFields = (body) => {
  const title = clean(body.title, 200);
  const category = clean(body.category, 50);
  const paidTo = clean(body.paidTo, 150);
  const note = clean(body.note, 255);
  const paymentMethod = clean(body.paymentMethod, 20) || 'cash';
  const date = clean(body.expenseDate, 10);
  const amount = Number(body.amount);

  if (!title) return { error: 'Enter a description' };
  if (!CATEGORIES.includes(category)) return { error: 'Select a category' };
  if (!METHODS.includes(paymentMethod)) return { error: 'Select a payment method' };
  if (!isValidDate(date) || date < '2000-01-01') return { error: 'Enter a valid date' };
  if (date > ymd(new Date())) return { error: "The date can't be in the future" };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
    return { error: 'Enter an amount greater than 0' };
  }

  return {
    data: {
      title,
      category,
      paymentMethod,
      expenseDate: date,
      paidTo: paidTo || null,
      note: note || null,
      amount: fromCents(Math.round(amount * 100)),
    },
  };
};

// ---------- GET /api/expenses?search&from&to&category&method&sort&page&pageSize ----------
exports.getExpenses = async (req, res) => {
  try {
    const q = req.query;
    const pageSize = [10, 25, 50].includes(parseInt(q.pageSize, 10)) ? parseInt(q.pageSize, 10) : 10;
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const sort = SORTS[q.sort] ? q.sort : 'date_desc';

    const from = clean(q.from, 10);
    const to = clean(q.to, 10);
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return res.status(400).json({ message: 'Invalid date range' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ message: 'The start date must be before the end date' });
    }

    const and = [];
    const term = clean(q.search, 100).replace(/[\\%_]/g, '\\$&'); // escape LIKE wildcards
    if (term) {
      and.push({ [Op.or]: [{ title: { [Op.like]: `%${term}%` } }, { paidTo: { [Op.like]: `%${term}%` } }] });
    }
    if (from) and.push({ expenseDate: { [Op.gte]: from } });
    if (to) and.push({ expenseDate: { [Op.lte]: to } });
    if (CATEGORIES.includes(q.category)) and.push({ category: q.category });
    if (METHODS.includes(q.method)) and.push({ paymentMethod: q.method });
    const where = and.length ? { [Op.and]: and } : {};

    const [found, sumRow] = await Promise.all([
      Expense.findAndCountAll({ where, order: SORTS[sort], limit: pageSize, offset: (page - 1) * pageSize }),
      Expense.findOne({
        attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']],
        where,
        raw: true,
      }),
    ]);

    res.json({
      rows: found.rows.map(toJson),
      total: found.count,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(found.count / pageSize)),
      filteredTotal: fromCents(toCents(sumRow.total)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- GET /api/expenses/summary ----------
exports.getExpenseSummary = async (req, res) => {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const r = {
      today: ymd(now),
      monthStart: ymd(new Date(y, m, 1)),
      nextMonth: ymd(new Date(y, m + 1, 1)),
      yearStart: `${y}-01-01`,
      nextYear: `${y + 1}-01-01`,
      chartStart: ymd(new Date(y, m - 5, 1)),
    };

    const [totals] = await sequelize.query(
      `SELECT
         COALESCE(SUM(CASE WHEN expenseDate = :today THEN amount END), 0) AS todayTotal,
         COALESCE(SUM(CASE WHEN expenseDate >= :monthStart AND expenseDate < :nextMonth THEN amount END), 0) AS monthTotal,
         COALESCE(SUM(CASE WHEN expenseDate >= :yearStart AND expenseDate < :nextYear THEN amount END), 0) AS yearTotal
       FROM Expenses`,
      { replacements: r, type: QueryTypes.SELECT }
    );

    const monthByCategory = await sequelize.query(
      `SELECT category, SUM(amount) AS total FROM Expenses
        WHERE expenseDate >= :monthStart AND expenseDate < :nextMonth GROUP BY category`,
      { replacements: r, type: QueryTypes.SELECT }
    );
    const catCents = {};
    monthByCategory.forEach((row) => {
      const c = normCategory(row.category);
      catCents[c] = (catCents[c] || 0) + toCents(row.total);
    });
    const top = Object.entries(catCents).sort((a, b) => b[1] - a[1])[0];

    const chartRows = await sequelize.query(
      `SELECT DATE_FORMAT(expenseDate, '%Y-%m') AS ym, category, SUM(amount) AS total FROM Expenses
        WHERE expenseDate >= :chartStart AND expenseDate < :nextMonth GROUP BY ym, category`,
      { replacements: r, type: QueryTypes.SELECT }
    );

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    }
    const grid = new Map(months.map((ym) => [ym, Object.fromEntries(CATEGORIES.map((c) => [c, 0]))]));
    chartRows.forEach((row) => {
      const cell = grid.get(row.ym);
      if (cell) cell[normCategory(row.category)] += toCents(row.total);
    });
    const chart = months.map((ym) => {
      const out = { month: ym };
      CATEGORIES.forEach((c) => { out[c] = grid.get(ym)[c] / 100; });
      return out;
    });

    res.json({
      today: fromCents(toCents(totals.todayTotal)),
      month: fromCents(toCents(totals.monthTotal)),
      year: fromCents(toCents(totals.yearTotal)),
      largest: top && top[1] > 0 ? { category: top[0], amount: fromCents(top[1]) } : null,
      chart,
      categories: CATEGORIES,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- GET /api/expenses/:id ----------
exports.getExpenseById = async (req, res) => {
  try {
    const id = idOf(req);
    const expense = await Expense.findByPk(id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['name'] },
        { model: User, as: 'updatedBy', attributes: ['name'] },
      ],
    });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const logs = await ExpenseLog.findAll({
      where: { expenseId: id },
      include: [{ model: User, as: 'actor', attributes: ['name'] }],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: 20,
    });
    res.json({ expense: toJson(expense), logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- GET /api/expenses/:id/receipt ----------
exports.getReceipt = async (req, res) => {
  try {
    const expense = await Expense.findByPk(idOf(req));
    if (!expense || !expense.receiptFile) return res.status(404).json({ message: 'No receipt for this expense' });

    const name = path.basename(expense.receiptFile);
    const full = path.join(RECEIPT_DIR, name);
    if (!fs.existsSync(full)) return res.status(404).json({ message: 'The receipt file is missing' });

    res.setHeader('Content-Type', TYPE_BY_EXT[path.extname(name).toLowerCase()] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(full);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- POST /api/expenses  (multipart: fields + optional "receipt" file) ----------
exports.createExpense = async (req, res) => {
  const uploaded = req.file ? req.file.filename : null;
  let committed = false;
  try {
    const f = parseFields(req.body);
    if (f.error) {
      removeFile(uploaded);
      return res.status(400).json({ message: f.error });
    }

    const expense = await sequelize.transaction(async (t) => {
      const e = await Expense.create(
        { ...f.data, receiptFile: uploaded, createdById: req.user.id, updatedById: req.user.id },
        { transaction: t }
      );
      await ExpenseLog.create(
        { expenseId: e.id, userId: req.user.id, action: 'created', summary: describe(e) },
        { transaction: t }
      );
      return e;
    });
    committed = true;

    res.status(201).json(toJson(expense));
  } catch (error) {
    if (!committed) removeFile(uploaded);
    res.status(500).json({ message: error.message });
  }
};

// ---------- PUT /api/expenses/:id ----------
exports.updateExpense = async (req, res) => {
  const uploaded = req.file ? req.file.filename : null;
  let committed = false;
  try {
    const f = parseFields(req.body);
    if (f.error) {
      removeFile(uploaded);
      return res.status(400).json({ message: f.error });
    }

    const expense = await Expense.findByPk(idOf(req));
    if (!expense) {
      removeFile(uploaded);
      return res.status(404).json({ message: 'Expense not found' });
    }

    const oldFile = expense.receiptFile;
    const diffs = [];
    const cmp = (label, before, after) => {
      if (String(before ?? '') !== String(after ?? '')) diffs.push(`${label}: ${before ?? '-'} -> ${after ?? '-'}`);
    };
    cmp('Date', expense.expenseDate, f.data.expenseDate);
    cmp('Description', expense.title, f.data.title);
    cmp('Category', expense.category, f.data.category);
    cmp('Paid to', expense.paidTo, f.data.paidTo);
    cmp('Method', expense.paymentMethod, f.data.paymentMethod);
    cmp('Amount', expense.amount, f.data.amount);
    cmp('Notes', expense.note, f.data.note);

    let receiptFile = oldFile;
    if (uploaded) {
      receiptFile = uploaded;
      diffs.push(oldFile ? 'Receipt replaced' : 'Receipt added');
    } else if (req.body.removeReceipt === 'true' && oldFile) {
      receiptFile = null;
      diffs.push('Receipt removed');
    }

    await sequelize.transaction(async (t) => {
      await expense.update(
        { ...f.data, receiptFile, ...(diffs.length ? { updatedById: req.user.id } : {}) },
        { transaction: t }
      );
      if (diffs.length) {
        await ExpenseLog.create(
          { expenseId: expense.id, userId: req.user.id, action: 'updated', summary: diffs.join('; ').slice(0, 500) },
          { transaction: t }
        );
      }
    });
    committed = true;

    if (receiptFile !== oldFile) removeFile(oldFile);
    res.json(toJson(expense));
  } catch (error) {
    if (!committed) removeFile(uploaded);
    res.status(500).json({ message: error.message });
  }
};

// ---------- DELETE /api/expenses/:id  (admin only, enforced in the route) ----------
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(idOf(req));
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    await sequelize.transaction(async (t) => {
      await ExpenseLog.create(
        { expenseId: expense.id, userId: req.user.id, action: 'deleted', summary: describe(expense) },
        { transaction: t }
      );
      await expense.destroy({ transaction: t });
    });

    removeFile(expense.receiptFile);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};