const Customer = require('../models/Customer');
const { Op } = require('sequelize');

// 
exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search && search.trim()) {
      const term = search.trim();
      const conditions = [
        { name: { [Op.like]: `%${term}%` } },
        { phone: { [Op.like]: `%${term}%` } },
      ];
      if (/^(c-?)?\d+$/i.test(term)) {
        conditions.push({ id: parseInt(term.replace(/\D/g, ''), 10) });
      }
      where[Op.or] = conditions;
    }

    const customers = await Customer.findAll({ where, order: [['name', 'ASC']] });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ message: 'Customer name is required' });

    const customer = await Customer.create({ name, phone, email, address });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// PUT /api/customers/:id/loan-eligibility
exports.setLoanEligibility = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.loanAllowed = !!req.body.loanAllowed;
    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};