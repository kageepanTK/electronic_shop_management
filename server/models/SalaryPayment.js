const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const SalaryPayment = sequelize.define(
  'SalaryPayment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    payMonth: { type: DataTypes.STRING(7), allowNull: false }, // 'YYYY-MM'
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // amount paid at that time
    paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    note: { type: DataTypes.STRING },
  },
  {
    indexes: [{ unique: true, name: 'uniq_salary_user_month', fields: ['userId', 'payMonth'] }],
  }
);

// RESTRICT keeps payroll history safe: someone with payments can't be deleted
SalaryPayment.belongsTo(User, {
  as: 'employee',
  foreignKey: { name: 'userId', allowNull: false },
  onDelete: 'RESTRICT',
});
SalaryPayment.belongsTo(User, { as: 'paidBy', foreignKey: 'paidById', constraints: false });

module.exports = SalaryPayment;