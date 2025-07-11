const jwt = require('jsonwebtoken');
const User = require('../models/User');

const tokenRefresh = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.decode(token);
    const now = Date.now() / 1000;
    
    // If token expires in less than 5 minutes, refresh it
    if (decoded.exp - now < 300) {
      const user = await User.findById(decoded.userId);
      if (user) {
        const newToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.setHeader('X-New-Token', newToken);
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = tokenRefresh;