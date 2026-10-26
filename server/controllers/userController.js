const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const SalaryPayment = require('../models/SalaryPayment');

const ROLES = ['admin', 'manager', 'staff'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toCents = (v) => Math.round(Number(v) * 100);
const fromCents = (c) => (c / 100).toFixed(2);
const monthOf = (d) => new Date(d).toLocaleDateString('en-CA').slice(0, 7); // YYYY-MM
const currentMonth = () => monthOf(new Date());

// Removes the password hash but tells the UI whether the person can sign in
const publicUser = (u) => {
  const json = u.toJSON();
  json.hasLogin = !!json.password;
  delete json.password;
  return json;
};

const parseSalary = (value, required) => {
  if (value === undefined || value === null || value === '') {
    return required ? { error: 'Enter the monthly salary' } : { cents: 0 };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 99999999.99) return { error: 'Enter a valid monthly salary' };
  return { cents: Math.round(n * 100) };
};

const parsePayDay = (value) => {
  if (value === undefined || value === null || value === '') return { day: 25 };
  const d = Number(value);
  if (!Number.isInteger(d) || d < 1 || d > 28) return { error: 'Pay day must be between 1 and 28' };
  return { day: d };
};

// GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({ order: [['name', 'ASC']] });
    res.json(users.map(publicUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users  (admin adds a team member; staff may be payroll-only)
exports.createUser = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const role = req.body.role || 'staff';
    const jobTitle = typeof req.body.jobTitle === 'string' ? req.body.jobTitle.trim().slice(0, 100) : '';
    const wantsPos = req.body.posAccess === true || req.body.posAccess === 'true';

    if (!name || name.length > 100) return res.status(400).json({ message: 'Enter a name (up to 100 characters)' });
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    // Admins and managers always sign in. Staff sign in only if given POS access.
    const needsLogin = role !== 'staff' || wantsPos;

    let email = null;
    let hashed = null;
    if (needsLogin) {
      email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = req.body.password;
      if (!EMAIL_RE.test(email) || email.length > 100) {
        return res.status(400).json({ message: 'Enter a valid email address' });
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
        return res.status(400).json({ message: 'Password must be 8 to 72 characters' });
      }
      if (await User.findOne({ where: { email } })) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      hashed = await bcrypt.hash(password, 10);
    }

    const sal = parseSalary(req.body.monthlySalary, false);
    if (sal.error) return res.status(400).json({ message: sal.error });
    const pd = parsePayDay(req.body.payDay);
    if (pd.error) return res.status(400).json({ message: pd.error });

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      jobTitle: jobTitle || null,
      posAccess: needsLogin,
      monthlySalary: fromCents(sal.cents),
      payDay: pd.day,
    });

    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id/role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own role' });

    if (role !== 'staff' && (!user.email || !user.password)) {
      return res.status(400).json({
        message: 'Give this person POS access (login details) first, then change their role.',
      });
    }

    user.role = role;
    if (role !== 'staff') user.posAccess = true;
    await user.save();
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id/access   body: { posAccess: boolean, email?, password? }
exports.setAccess = async (req, res) => {
  try {
    if (typeof req.body.posAccess !== 'boolean') {
      return res.status(400).json({ message: 'posAccess must be true or false' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'You cannot change your own access' });
    if (user.role !== 'staff') {
      return res.status(400).json({ message: 'Admins and managers always have system access' });
    }

    if (req.body.posAccess) {
      // Someone who never had a login needs an email and a temporary password
      if (!user.email) {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (!EMAIL_RE.test(email) || email.length > 100) {
          return res.status(400).json({ message: 'Enter a valid email address' });
        }
        if (await User.findOne({ where: { email, id: { [Op.ne]: user.id } } })) {
          return res.status(400).json({ message: 'A user with this email already exists' });
        }
        user.email = email;
      }
      if (!user.password) {
        const password = req.body.password;
        if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
          return res.status(400).json({ message: 'Password must be 8 to 72 characters' });
        }
        user.password = await bcrypt.hash(password, 10);
      }
    }

    user.posAccess = req.body.posAccess;
    await user.save();
    res.json(publicUser(user));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/:id/salary   body: { monthlySalary, payDay, jobTitle? }
exports.updateSalary = async (req, res) => {
  try {
    const sal = parseSalary(req.body.monthlySalary, true);
    if (sal.error) return res.status(400).json({ message: sal.error });
    const pd = parsePayDay(req.body.payDay);
    if (pd.error) return res.status(400).json({ message: pd.error });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.monthlySalary = fromCents(sal.cents);
    user.payDay = pd.day;
    if (typeof req.body.jobTitle === 'string') {
      user.jobTitle = req.body.jobTitle.trim().slice(0, 100) || null;
    }
    await user.save();
    res.json({ id: user.id, monthlySalary: user.monthlySalary, payDay: user.payDay, jobTitle: user.jobTitle });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users/payroll?month=YYYY-MM
exports.getPayroll = async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    if (!MONTH_RE.test(month)) return res.status(400).json({ message: 'Invalid month' });

    const [y, m] = month.split('-').map(Number);
    const startOfNextMonth = new Date(y, m, 1);

    const [users, payments, teamMembers] = await Promise.all([
      User.findAll({
        where: { createdAt: { [Op.lt]: startOfNextMonth } }, // only people who had joined by then
        order: [['name', 'ASC']],
      }),
      SalaryPayment.findAll({ where: { payMonth: month } }),
      User.count(),
    ]);

    const byUser = new Map(payments.map((p) => [p.userId, p]));
    let payrollCents = 0;
    let pendingCents = 0;
    let paidCents = 0;

    const rows = users.map((u) => {
      const salaryCents = toCents(u.monthlySalary);
      const pay = byUser.get(u.id);
      let status = 'paid';
      if (!pay) status = salaryCents > 0 ? 'pending' : 'unset';

      payrollCents += pay ? toCents(pay.amount) : salaryCents;
      if (pay) paidCents += toCents(pay.amount);
      if (status === 'pending') pendingCents += salaryCents;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        jobTitle: u.jobTitle,
        posAccess: u.posAccess,
        hasLogin: !!u.password,
        monthlySalary: u.monthlySalary,
        payDay: u.payDay,
        status,
        payment: pay ? { id: pay.id, amount: pay.amount, paidAt: pay.paidAt, note: pay.note } : null,
      };
    });

    res.json({
      month,
      rows,
      totals: {
        teamMembers,
        monthlyPayroll: fromCents(payrollCents),
        paid: fromCents(paidCents),
        pending: fromCents(pendingCents),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users/:id/payments   body: { month, note? }
exports.markPaid = async (req, res) => {
  try {
    const { month } = req.body;
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 200) || null : null;

    if (typeof month !== 'string' || !MONTH_RE.test(month)) {
      return res.status(400).json({ message: 'Select a valid month' });
    }
    if (month > currentMonth()) {
      return res.status(400).json({ message: "You can't mark a future month as paid" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (month < monthOf(user.createdAt)) {
      return res.status(400).json({ message: 'This person had not joined yet in that month' });
    }

    const cents = toCents(user.monthlySalary);
    if (!(cents > 0)) {
      return res.status(400).json({ message: 'Set a monthly salary before marking it as paid' });
    }

    const payment = await SalaryPayment.create({
      userId: user.id,
      payMonth: month,
      amount: fromCents(cents),
      paidAt: new Date(),
      paidById: req.user.id,
      note,
    });
    res.status(201).json(payment);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'This month is already marked as paid' });
    }
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/users/payments/:paymentId
exports.undoPayment = async (req, res) => {
  try {
    const payment = await SalaryPayment.findByPk(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    await payment.destroy();
    res.json({ message: 'Payment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users/payments?userId=&limit=
exports.getPaymentHistory = async (req, res) => {
  try {
    const where = {};
    if (req.query.userId) {
      const id = Number(req.query.userId);
      if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid user' });
      where.userId = id;
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const rows = await SalaryPayment.findAll({
      where,
      include: [
        { model: User, as: 'employee', attributes: ['id', 'name'] },
        { model: User, as: 'paidBy', attributes: ['name'] },
      ],
      order: [['paidAt', 'DESC'], ['id', 'DESC']],
      limit,
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'This person has records linked to them (such as salary payments), so they cannot be deleted.',
      });
    }
    res.status(500).json({ message: error.message });
  }
};