const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const sequelize = require('../config/db');

const withCategories = [
  { model: Category, attributes: ['id', 'name'], through: { attributes: [] } },
];

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Validates and normalises the request body for create and update
const parseFields = (body) => {
  const name = clean(body.name, 150);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 100);
  const address = clean(body.address, 255);

  if (!name) return { error: 'Supplier name is required' };
  if (phone && !/^[0-9+()\-\s]{5,30}$/.test(phone)) return { error: 'Enter a valid phone number' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address' };

  const raw = Array.isArray(body.categoryIds) ? body.categoryIds : [];
  const categoryIds = [...new Set(raw.map(Number))];
  if (categoryIds.some((n) => !Number.isInteger(n) || n < 1)) return { error: 'Invalid category selection' };

  return { name, phone: phone || null, email: email || null, address: address || null, categoryIds };
};

const rollback = async (t) => {
  if (!t.finished) await t.rollback();
};

// GET /api/suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ include: withCategories, order: [['name', 'ASC']] });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/suppliers
exports.createSupplier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const f = parseFields(req.body);
    if (f.error) {
      await rollback(t);
      return res.status(400).json({ message: f.error });
    }

    if (f.categoryIds.length) {
      const found = await Category.count({ where: { id: f.categoryIds }, transaction: t });
      if (found !== f.categoryIds.length) {
        await rollback(t);
        return res.status(400).json({ message: 'One of the selected categories does not exist' });
      }
    }

    const supplier = await Supplier.create(
      { name: f.name, phone: f.phone, email: f.email, address: f.address, isActive: true },
      { transaction: t }
    );
    await supplier.setCategories(f.categoryIds, { transaction: t });

    await t.commit();
    const full = await Supplier.findByPk(supplier.id, { include: withCategories });
    res.status(201).json(full);
  } catch (error) {
    await rollback(t);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/suppliers/:id
exports.updateSupplier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const f = parseFields(req.body);
    if (f.error) {
      await rollback(t);
      return res.status(400).json({ message: f.error });
    }

    const supplier = await Supplier.findByPk(req.params.id, { transaction: t });
    if (!supplier) {
      await rollback(t);
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (f.categoryIds.length) {
      const found = await Category.count({ where: { id: f.categoryIds }, transaction: t });
      if (found !== f.categoryIds.length) {
        await rollback(t);
        return res.status(400).json({ message: 'One of the selected categories does not exist' });
      }
    }

    await supplier.update(
      { name: f.name, phone: f.phone, email: f.email, address: f.address },
      { transaction: t }
    );
    await supplier.setCategories(f.categoryIds, { transaction: t });

    await t.commit();
    const full = await Supplier.findByPk(supplier.id, { include: withCategories });
    res.json(full);
  } catch (error) {
    await rollback(t);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/suppliers/:id/status   body: { isActive: true | false }
exports.setSupplierStatus = async (req, res) => {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be true or false' });
    }
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    supplier.isActive = req.body.isActive;
    await supplier.save();
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/suppliers/:id
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    await supplier.destroy();
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};