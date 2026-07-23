const Customer = require('../models/Customer');
const { Op } = require('sequelize');

exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

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