const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, account no longer exists' });
    }
    // Staff without POS access are payroll-only: they cannot use the system
    if (user.role === 'staff' && !user.posAccess) {
      return res.status(403).json({ message: 'Your account does not have system access' });
    }
    req.user = user;
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
  next();
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};