const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - Headers:', req.headers['authorization']);
    console.log('Auth middleware - Token:', token ? 'Token present' : 'No token');

    if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '28a80c158d0356b0a2de5ff2e4c759f49710342be06f357f31e2d3522ca315c6a18f99a70d96ba2e5196c36ebb9d3c7a43678abc01e5bca03a9070c540ed4a10');
        console.log('Auth middleware - Token decoded successfully for user:', decoded.userId);
        
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            console.log('Auth middleware - User not found:', decoded.userId);
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        console.log('Auth middleware - User authenticated:', user._id, user.role);
        req.user = {
            ...user.toObject(),
            id: user._id  // Add compatibility property
        };
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

const adminAuth = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
};

module.exports = { authMiddleware, adminAuth };