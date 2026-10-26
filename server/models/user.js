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
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
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
    jobTitle: { 
      type: DataTypes.STRING(100), 
      allowNull: true 
    },
  posAccess: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    defaultValue: true 
  },
});

module.exports = User;