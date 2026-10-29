const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

// No foreign key to Expenses on purpose, so the record of a deleted expense survives
const ExpenseLog = sequelize.define(
  'ExpenseLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    expenseId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(20), allowNull: false }, // created | updated | deleted
    summary: { type: DataTypes.STRING(500) },
  },
  { indexes: [{ fields: ['expenseId'] }] }
);

ExpenseLog.belongsTo(User, { as: 'actor', foreignKey: 'userId', constraints: false });

module.exports = ExpenseLog;