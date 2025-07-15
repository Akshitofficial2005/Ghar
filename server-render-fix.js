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
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Auth middleware - User authenticated:', user._id, user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024', { expiresIn: '7d' });
    
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// FLEXIBLE PG Creation - accepts ANY data format
app.post('/api/pgs', authMiddleware, async (req, res) => {
  try {
    console.log('=== PG CREATION DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Extract data flexibly
    const pgData = {
      name: req.body.name || req.body.pgName,
      description: req.body.description || '',
      location: req.body.location || req.body.address || { city: 'Unknown' },
      price: Number(req.body.price || req.body.pricePerMonth) || 0,
      pricePerMonth: Number(req.body.pricePerMonth || req.body.price) || 0,
      totalRooms: Number(req.body.totalRooms) || 1,
      availableRooms: Number(req.body.availableRooms || req.body.totalRooms) || 1,
      contactNumber: req.body.contactNumber || '',
      amenities: req.body.amenities || [],
      rules: req.body.rules || [],
      images: req.body.images || [],
      roomTypes: req.body.roomTypes || [],
      owner: req.user._id,
      status: 'approved',
      isApproved: true,
      isActive: true
    };

    console.log('Processed PG data:', JSON.stringify(pgData, null, 2));

    // Validate minimum required fields
    if (!pgData.name) {
      return res.status(400).json({ 
        success: false, 
        message: 'PG name is required' 
      });
    }

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
    res.status(500).json({
      success: false,
      message: 'Failed to create PG listing',
      error: error.message
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
    const adminExists = await User.findOne({ email: 'admin@ghar.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'Admin User',
        email: 'admin@ghar.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin user created');
    }
  } catch (error) {
    console.error('Admin initialization error:', error);
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