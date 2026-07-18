const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  brand: { type: DataTypes.STRING },
  costPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stockQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  lowStockAlert: { type: DataTypes.INTEGER, defaultValue: 5 },
  imageUrl: { type: DataTypes.STRING },
});

// Associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

module.exports = Product;