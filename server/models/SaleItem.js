const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Sale = require('./Sale');
const Product = require('./Product');

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
});

// Associations
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', onDelete: 'CASCADE' });
Sale.hasMany(SaleItem, { foreignKey: 'saleId' });

SaleItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(SaleItem, { foreignKey: 'productId' });

module.exports = SaleItem;