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