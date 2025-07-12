const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const amenityRoutes = require('./routes/amenities');
const pgRoutes = require('./routes/pgs');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5001;

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Middleware
app.use(cors({
  origin: [
    'https://gharfr.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Increase payload size limits for image uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount auth routes
app.use('/api/auth', authRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Backend server is running'
  });
});

// Wake-up endpoint for Render free tier
app.get('/api/wake-up', (req, res) => {
  res.json({ 
    status: 'awake',
    message: 'Backend server is now awake and ready'
  });
});

// Emergency auth test endpoint - no middleware required
app.get('/api/emergency-test', (req, res) => {
  res.json({ 
    status: 'Server is working',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      jwtSecretExists: !!process.env.JWT_SECRET,
      mongoUriExists: !!process.env.MONGODB_URI,
      port: process.env.PORT || 5001
    }
  });
});

// Debug auth endpoint
app.get('/api/debug-auth', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('Debug Auth - Headers:', req.headers['authorization']);
  console.log('Debug Auth - Token:', token ? 'Token present' : 'No token');
  
  if (!token) {
    return res.json({ 
      error: 'No token provided',
      headers: req.headers,
      authHeader: authHeader
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const User = require('./models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Debug Auth - Token decoded:', decoded);
    
    const user = await User.findById(decoded.userId).select('-password');
    console.log('Debug Auth - User found:', user ? user.email : 'No user');
    
    res.json({
      success: true,
      decoded: decoded,
      user: user ? {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      } : null
    });
  } catch (error) {
    console.error('Debug Auth - Error:', error);
    res.json({
      error: error.message,
      token: token.substring(0, 20) + '...',
      jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});