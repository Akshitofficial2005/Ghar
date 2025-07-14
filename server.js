const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ghar', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// FLEXIBLE PG Schema - accepts any data format
const pgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: mongoose.Schema.Types.Mixed, // Accept any location format
  price: Number,
  pricePerMonth: Number, // Backward compatibility
  totalRooms: Number,
  availableRooms: Number,
  contactNumber: String,
  amenities: mongoose.Schema.Types.Mixed, // Accept array or object
  rules: [String],
  images: mongoose.Schema.Types.Mixed, // Accept any image format
  roomTypes: [mongoose.Schema.Types.Mixed],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'approved' },
  isApproved: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow any additional fields

const User = mongoose.model('User', userSchema);
const PG = mongoose.model('PG', pgSchema);

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header received:', authHeader);
    
    if (!authHeader || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') {
      console.log('No valid token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
      console.log('Invalid token format');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('User not found for token');
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Auth middleware - User authenticated:', user._id, user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Invalid token: ' + error.message });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024', { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024', { expiresIn: '7d' });
    
    console.log('Login successful:', email);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Add missing /auth/me endpoint
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// FLEXIBLE PG Creation - NO AUTH REQUIRED FOR TESTING
app.post('/api/pgs', async (req, res) => {
  try {
    console.log('=== PG CREATION DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Extract data flexibly - handle null/undefined values
    const pgData = {
      name: req.body.name || req.body.pgName || 'Unnamed PG',
      description: req.body.description || '',
      location: req.body.location || req.body.address || { city: 'Unknown' },
      price: Number(req.body.price || req.body.pricePerMonth) || 1000,
      pricePerMonth: Number(req.body.pricePerMonth || req.body.price) || 1000,
      totalRooms: Number(req.body.totalRooms) || 1,
      availableRooms: Number(req.body.availableRooms || req.body.totalRooms) || 1,
      contactNumber: req.body.contactNumber || '9999999999',
      amenities: req.body.amenities || {},
      rules: Array.isArray(req.body.rules) ? req.body.rules : [],
      images: Array.isArray(req.body.images) ? req.body.images : [],
      roomTypes: Array.isArray(req.body.roomTypes) ? req.body.roomTypes : [],
      owner: null, // No owner for now
      status: 'approved',
      isApproved: true,
      isActive: true
    };

    console.log('Processed PG data:', JSON.stringify(pgData, null, 2));

    const newPG = new PG(pgData);
    await newPG.save();

    console.log('✅ PG created successfully:', newPG._id);

    res.status(201).json({
      success: true,
      message: 'PG listing created successfully!',
      data: newPG,
      id: newPG._id
    });

  } catch (error) {
    console.error('❌ PG creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create PG listing',
      error: error.message,
      details: error.stack
    });
  }
});

// Get PGs
app.get('/api/pgs', async (req, res) => {
  try {
    const pgs = await PG.find({ isActive: true, isApproved: true }).populate('owner', 'name email');
    res.json({ success: true, pgs, total: pgs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch PGs' });
  }
});

// Initialize admin user
const initializeAdmin = async () => {
  try {
    console.log('Checking for admin user...');
    const adminExists = await User.findOne({ email: 'admin@ghar.com' });
    
    if (!adminExists) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'Admin User',
        email: 'admin@ghar.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Also create a test user for easier testing
    const testUser = await User.findOne({ email: 'test@test.com' });
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      const user = new User({
        name: 'Test User',
        email: 'test@test.com',
        password: hashedPassword,
        role: 'owner'
      });
      await user.save();
      console.log('✅ Test user created: test@test.com / test123');
    }
  } catch (error) {
    console.error('❌ Admin initialization error:', error);
  }
};

// Start server
mongoose.connection.once('open', async () => {
  console.log('Connected to MongoDB');
  await initializeAdmin();
  
  app.listen(PORT, () => {
    console.log(`🚀 Ghar Backend (Render Fix) running on port ${PORT}`);
    console.log(`✅ Flexible PG creation endpoint: POST /api/pgs`);
    console.log(`🔑 Admin: admin@ghar.com / admin123`);
  });
});

console.log('Backend server running at http://localhost:' + PORT);
console.log('🔑 Login credentials:');
console.log('   Admin: admin@ghar.com / admin123');
console.log('   Test: test@test.com / test123');