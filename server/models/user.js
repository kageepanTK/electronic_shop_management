const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'staff'),
    defaultValue: 'staff',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
    monthlySalary: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, defaultValue: 0 
    },
  payDay: {
     type: DataTypes.INTEGER, 
     allowNull: false, defaultValue: 25 
    },
});

module.exports = User;