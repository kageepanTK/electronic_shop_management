const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  brand: { type: DataTypes.STRING },
  costPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sellingPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  // Whole-unit stock (bags, boxes, pieces — whatever the base unit is)
  stockQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  lowStockAlert: { type: DataTypes.INTEGER, defaultValue: 5 },
  imageUrl: { type: DataTypes.STRING },

  // Loose sale support
  allowLooseSales: { type: DataTypes.BOOLEAN, defaultValue: false },
  bagSize: { type: DataTypes.DECIMAL(10, 3), allowNull: true },      // e.g. 50 (kg per bag)
  looseUnit: { type: DataTypes.STRING, allowNull: true },             // e.g. "kg"
  loosePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },    // price per loose unit
  looseStock: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },    // current loose quantity available
});

Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

module.exports = Product;