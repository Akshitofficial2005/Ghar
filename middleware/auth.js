const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024';

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userIdFromToken = decoded.userId || decoded.id || decoded._id;
    const user = await User.findById(userIdFromToken).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    // Ensure both `_id` and `id` are available on req.user for compatibility
    req.user = user;
    try {
      req.user.id = user._id ? user._id.toString() : req.user.id;
    } catch (e) {
      // ignore
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Owner middleware
const ownerMiddleware = (req, res, next) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Owner access required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  ownerMiddleware
};