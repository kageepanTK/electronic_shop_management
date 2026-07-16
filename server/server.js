const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Sync models with MySQL (creates tables automatically)
sequelize
  .sync()
  .then(() => console.log('MySQL connected and synced'))
  .catch((err) => console.log('DB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));