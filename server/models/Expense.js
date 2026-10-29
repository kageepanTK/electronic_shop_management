const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false }, // shown as "Description"
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Other' },
  note: { type: DataTypes.STRING },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false },
  paidTo: { type: DataTypes.STRING(150), allowNull: true },
  paymentMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'cash' },
  receiptFile: { type: DataTypes.STRING, allowNull: true },
});

Expense.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById', constraints: false });
Expense.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedById', constraints: false });

module.exports = Expense;