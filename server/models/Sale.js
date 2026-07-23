const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('./Customer');
const User = require('./User');

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  paymentStatus: {
    type: DataTypes.ENUM('paid', 'partial', 'unpaid'),
    defaultValue: 'paid',
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'credit'),
    defaultValue: 'cash',
  },
  customerName: { type: DataTypes.STRING, defaultValue: 'Walk-in Customer' },
});

// Associations
Sale.belongsTo(Customer, { foreignKey: 'customerId', allowNull: true });
Customer.hasMany(Sale, { foreignKey: 'customerId' });

Sale.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Sale, { foreignKey: 'userId' });

module.exports = Sale;