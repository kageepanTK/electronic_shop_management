const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Customer = require('./Customer');
const User = require('./User');
const Product = require('./Product');
const Sale = require('./Sale');

const Loan = sequelize.define('Loan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  downPayment: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  loanAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  outstandingBalance: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  installmentCount: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'OVERDUE', 'PAID'),
    defaultValue: 'PENDING',
  },
  rejectionReason: { type: DataTypes.STRING },
  reviewedAt: { type: DataTypes.DATE },
  activatedAt: { type: DataTypes.DATE },
});

const LoanItem = sequelize.define('LoanItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
});

const LoanInstallment = sequelize.define('LoanInstallment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  number: { type: DataTypes.INTEGER, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'partial', 'paid'), defaultValue: 'pending' },
});

const LoanPayment = sequelize.define('LoanPayment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  note: { type: DataTypes.STRING },
});

// Associations
Loan.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Loan, { foreignKey: 'customerId' });

Loan.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Loan.belongsTo(User, { as: 'reviewedBy', foreignKey: 'reviewedById' });
Loan.belongsTo(Sale, { foreignKey: 'saleId' });

Loan.hasMany(LoanItem, { as: 'items', foreignKey: 'loanId', onDelete: 'CASCADE' });
LoanItem.belongsTo(Loan, { foreignKey: 'loanId' });
LoanItem.belongsTo(Product, { foreignKey: 'productId' });

Loan.hasMany(LoanInstallment, { as: 'installments', foreignKey: 'loanId', onDelete: 'CASCADE' });
LoanInstallment.belongsTo(Loan, { foreignKey: 'loanId' });

Loan.hasMany(LoanPayment, { as: 'payments', foreignKey: 'loanId', onDelete: 'CASCADE' });
LoanPayment.belongsTo(Loan, { foreignKey: 'loanId' });
LoanPayment.belongsTo(User, { as: 'receivedBy', foreignKey: 'receivedById' });

module.exports = { Loan, LoanItem, LoanInstallment, LoanPayment };