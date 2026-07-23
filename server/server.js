const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const dotenv = require('dotenv');

const saleRoutes = require('./routes/saleRoutes');
const customerRoutes = require('./routes/customerRoutes');


dotenv.config();

const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/categories', categoryRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Sync models with MySQL (creates tables automatically)
sequelize
  .sync({ alter: true })
  .then(() => console.log('MySQL connected and synced'))
  .catch((err) => console.log('DB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);