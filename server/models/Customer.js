const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  dueAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
});

module.exports = Customer;