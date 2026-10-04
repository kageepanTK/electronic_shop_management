const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');
const User = require('./User');

const StockHistory = sequelize.define('StockHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: {
    type: DataTypes.ENUM('bag_opened', 'loose_sale', 'bag_sale', 'restock', 'adjustment'),
    allowNull: false,
  },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false }, // positive or negative
  note: { type: DataTypes.STRING },
});

StockHistory.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(StockHistory, { foreignKey: 'productId' });

StockHistory.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(StockHistory, { foreignKey: 'userId' });

module.exports = StockHistory;