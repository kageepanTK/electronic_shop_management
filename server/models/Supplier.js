const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
});

// Which product categories a supplier provides
const SupplierCategory = sequelize.define(
  'SupplierCategory',
  {},
  { tableName: 'SupplierCategories', timestamps: false }
);

Supplier.belongsToMany(Category, { through: SupplierCategory, foreignKey: 'supplierId', otherKey: 'categoryId' });
Category.belongsToMany(Supplier, { through: SupplierCategory, foreignKey: 'categoryId', otherKey: 'supplierId' });

module.exports = Supplier;