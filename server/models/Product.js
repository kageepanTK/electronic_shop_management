const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');
const User = require('./User');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  brand: { type: DataTypes.STRING },
  costPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  // Whole-unit stock (bags, boxes, pieces)
  stockQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  lowStockAlert: { type: DataTypes.INTEGER, defaultValue: 5 },
  imageUrl: { type: DataTypes.STRING },

  // Loose sale support
  allowLooseSales: { type: DataTypes.BOOLEAN, defaultValue: false },
  bagSize: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
  looseUnit: { type: DataTypes.STRING, allowNull: true },
  loosePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  looseStock: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },

  // Product removal (archive)
  isRemoved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  removedAt: { type: DataTypes.DATE, allowNull: true },
  removalReason: { type: DataTypes.STRING, allowNull: true },
  removalNote: { type: DataTypes.STRING, allowNull: true },
  removedById: { type: DataTypes.INTEGER, allowNull: true },
});

// Associations: these must come AFTER the define() above
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

Product.belongsTo(User, { as: 'removedBy', foreignKey: 'removedById', constraints: false });

module.exports = Product;