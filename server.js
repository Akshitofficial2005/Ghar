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
app.use(bodyParser.json());

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

// Temporary admin setup endpoint (for debugging)
app.post('/api/setup-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'agrawalakshit36@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'akshit@Mayank2003';
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Find and update or create admin user
    const adminUser = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        phone: '+919907002817',
        role: 'admin',
        isVerified: true
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      message: 'Admin user created/updated successfully',
      admin: {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup admin user',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});