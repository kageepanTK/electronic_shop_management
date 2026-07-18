const Product = require('../models/Product');
const Category = require('../models/Category');
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
    const { name, brand, categoryId, costPrice, sellingPrice, stockQty, lowStockAlert } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      name, brand, categoryId, costPrice, sellingPrice,
      stockQty: stockQty || 0,
      lowStockAlert: lowStockAlert || 5,
      imageUrl,
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

    const { name, brand, categoryId, costPrice, sellingPrice, stockQty, lowStockAlert } = req.body;
    if (req.file) product.imageUrl = `/uploads/${req.file.filename}`;

    Object.assign(product, { name, brand, categoryId, costPrice, sellingPrice, stockQty, lowStockAlert });
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