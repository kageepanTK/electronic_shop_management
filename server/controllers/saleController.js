const sequelize = require('../config/db');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// POST /api/sales
exports.createSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      items,            // [{ productId, quantity }]
      customerId,       // optional
      customerName,     // used if walk-in
      discount = 0,
      paidAmount,
      paymentMethod,    // 'cash' | 'card' | 'credit'
    } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No items in sale' });
    }

    let totalAmount = 0;
    const saleItemsData = [];

    // Validate stock and calculate totals
for (const item of items) {
  const product = await Product.findByPk(item.productId, { transaction: t });

  if (!product) {
    await t.rollback();
    return res.status(404).json({ message: `Product not found: ${item.productId}` });
  }

  const saleType = item.saleType || 'bag'; // default to bag if not specified

  if (saleType === 'loose') {
    if (!product.allowLooseSales) {
      await t.rollback();
      return res.status(400).json({ message: `${product.name} does not support loose sales` });
    }
    if (parseFloat(product.looseStock) < item.quantity) {
      await t.rollback();
      return res.status(400).json({
        message: `Insufficient loose stock for ${product.name}. Available: ${product.looseStock}${product.looseUnit}`,
      });
    }

    const unitPrice = product.loosePrice || product.sellingPrice;
    const subtotal = unitPrice * item.quantity;
    totalAmount += parseFloat(subtotal);

    saleItemsData.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      saleType: 'loose',
    });

    product.looseStock = parseFloat(product.looseStock) - parseFloat(item.quantity);
    await product.save({ transaction: t });

    await StockHistory.create({
      productId: product.id,
      userId: req.user.id,
      type: 'loose_sale',
      quantity: -item.quantity,
      note: `Sold ${item.quantity}${product.looseUnit} loose`,
    }, { transaction: t });

  } else {
    // existing whole-bag/unit sale logic
    if (product.stockQty < item.quantity) {
      await t.rollback();
      return res.status(400).json({
        message: `Insufficient stock for ${product.name}. Available: ${product.stockQty}`,
      });
    }

    const subtotal = product.sellingPrice * item.quantity;
    totalAmount += parseFloat(subtotal);

    saleItemsData.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.sellingPrice,
      subtotal,
      saleType: 'bag',
    });

    product.stockQty -= item.quantity;
    await product.save({ transaction: t });

    await StockHistory.create({
      productId: product.id,
      userId: req.user.id,
      type: 'bag_sale',
      quantity: -item.quantity,
      note: `Sold ${item.quantity} unit(s)`,
    }, { transaction: t });
  }
}

    const finalTotal = totalAmount - (discount || 0);
    const actualPaid = paidAmount !== undefined ? paidAmount : finalTotal;

    let paymentStatus = 'paid';
    if (actualPaid <= 0) paymentStatus = 'unpaid';
    else if (actualPaid < finalTotal) paymentStatus = 'partial';

    // Create the sale
    const sale = await Sale.create(
      {
        customerId: customerId || null,
        customerName: customerName || 'Walk-in Customer',
        userId: req.user.id,
        totalAmount: finalTotal,
        discount,
        paidAmount: actualPaid,
        paymentStatus,
        paymentMethod: paymentMethod || 'cash',
      },
      { transaction: t }
    );

    // Create sale items linked to this sale
    for (const itemData of saleItemsData) {
      await SaleItem.create({ ...itemData, saleId: sale.id }, { transaction: t });
    }

    // If registered customer and there's a due amount, update their balance
    if (customerId && paymentStatus !== 'paid') {
      const customer = await Customer.findByPk(customerId, { transaction: t });
      if (customer) {
        customer.dueAmount = parseFloat(customer.dueAmount) + (finalTotal - actualPaid);
        await customer.save({ transaction: t });
      }
    }

    await t.commit();

    // Fetch full sale with items for the response/invoice
    const fullSale = await Sale.findByPk(sale.id, {
      include: [{ model: SaleItem, include: [Product] }, Customer],
    });

    res.status(201).json(fullSale);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// GET /api/sales
exports.getSales = async (req, res) => {
  try {
    const where = {};
    // Staff only sees their own sales
    if (req.user.role === 'staff') {
      where.userId = req.user.id;
    }

    const sales = await Sale.findAll({
      where,
      include: [Customer],
      order: [['createdAt', 'DESC']],
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/sales/:id
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{ model: SaleItem, include: [Product] }, Customer],
    });

    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};