const Product = require('../models/Product');
const Category = require('../models/Category');
const StockHistory = require('../models/StockHistory');
const User = require('../models/User');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

// GET /api/products?categoryId=&search=
exports.getProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const where = {};

    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const products = await Product.findAll({
      where,
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, attributes: ['id', 'name'] }],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const {
      name, brand, categoryId, costPrice, sellingPrice, stockQty, lowStockAlert,
      allowLooseSales, bagSize, looseUnit, loosePrice,
    } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      name,
      brand,
      categoryId,
      costPrice,
      sellingPrice,
      stockQty: stockQty || 0,
      lowStockAlert: lowStockAlert || 5,
      imageUrl,
      allowLooseSales: allowLooseSales === 'true' || allowLooseSales === true,
      bagSize: bagSize || null,
      looseUnit: looseUnit || null,
      loosePrice: loosePrice || null,
      looseStock: 0,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const {
      name, brand, categoryId, costPrice, sellingPrice, stockQty, lowStockAlert,
      allowLooseSales, bagSize, looseUnit, loosePrice,
    } = req.body;

    if (req.file) product.imageUrl = `/uploads/${req.file.filename}`;

    Object.assign(product, {
      name,
      brand,
      categoryId,
      costPrice,
      sellingPrice,
      stockQty,
      lowStockAlert,
      allowLooseSales: allowLooseSales === 'true' || allowLooseSales === true,
      bagSize: bagSize || null,
      looseUnit: looseUnit || null,
      loosePrice: loosePrice || null,
    });

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products/:id/open-bag
exports.openBag = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.allowLooseSales) {
      await t.rollback();
      return res.status(400).json({ message: 'This product does not allow loose sales' });
    }

    if (product.stockQty < 1) {
      await t.rollback();
      return res.status(400).json({ message: 'No whole bags available to open' });
    }

    product.stockQty -= 1;
    product.looseStock = parseFloat(product.looseStock) + parseFloat(product.bagSize);
    await product.save({ transaction: t });

    await StockHistory.create(
      {
        productId: product.id,
        userId: req.user.id,
        type: 'bag_opened',
        quantity: product.bagSize,
        note: `Opened 1 bag (${product.bagSize}${product.looseUnit}) → added to loose stock`,
      },
      { transaction: t }
    );

    await t.commit();
    res.json(product);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id/stock-history
exports.getStockHistory = async (req, res) => {
  try {
    const history = await StockHistory.findAll({
      where: { productId: req.params.id },
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// POST /api/products/:id/restock
// POST /api/products/:id/restock
exports.restockProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const qty = parseInt(req.body.quantity, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) {
      await t.rollback();
      return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 100000' });
    }

    // returns null if not provided, NaN if invalid, otherwise a 2-decimal number
    const parsePrice = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 99999999.99) return NaN;
      return Math.round(n * 100) / 100;
    };

    const buyPrice = parsePrice(req.body.buyPrice);
    const newSelling = parsePrice(req.body.sellingPrice);

    if (Number.isNaN(buyPrice)) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid buying price' });
    }
    if (newSelling !== null && (Number.isNaN(newSelling) || newSelling <= 0)) {
      await t.rollback();
      return res.status(400).json({ message: 'Selling price must be greater than 0' });
    }

    const product = await Product.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const cents = (v) => Math.round(parseFloat(v) * 100);
    const oldCost = parseFloat(product.costPrice);
    const oldSell = parseFloat(product.sellingPrice);

    product.stockQty += qty;

    const parts = [`Restock +${qty}`];

    if (buyPrice !== null) {
      if (cents(buyPrice) !== cents(oldCost)) {
        product.costPrice = buyPrice;
        parts.push(`buy ${oldCost.toFixed(2)} -> ${buyPrice.toFixed(2)}`);
      } else {
        parts.push(`buy ${buyPrice.toFixed(2)}`);
      }
    }

    if (newSelling !== null && cents(newSelling) !== cents(oldSell)) {
      product.sellingPrice = newSelling;
      parts.push(`sell ${oldSell.toFixed(2)} -> ${newSelling.toFixed(2)}`);
    }

    const userNote = (req.body.note || '').trim();
    const note = (parts.join('; ') + (userNote ? ` | ${userNote}` : '')).slice(0, 255);

    await product.save({ transaction: t });

    await StockHistory.create(
      { productId: product.id, userId: req.user.id, type: 'restock', quantity: qty, note },
      { transaction: t }
    );

    await t.commit();
    res.json(product);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};