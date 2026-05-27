/**
 * Ghar Backend Server - Production Ready
 * Optimized for scalability and reliability
 */

const logger = require('./utils/logger');
const Sentry = require('@sentry/node');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;
let MONGODB_URI = process.env.MONGODB_URI;
let __INMEM_MONGOD = null;
let MongoMemoryServer;
if (process.env.USE_IN_MEMORY_DB === 'true') {
  try {
    MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
  } catch (e) {
    console.warn('mongodb-memory-server not available; falling back to MONGODB_URI');
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Initialize Sentry if configured (captures exceptions and performance data)
if (process.env.SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.0
    });
    // Request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler());
    // Optional tracing handler
    if ((Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0) > 0) {
      app.use(Sentry.Handlers.tracingHandler());
    }
    logger.info('Sentry initialized');
  } catch (e) {
    logger.warn('Failed to initialize Sentry: %o', e.message || e);
  }
}

// In production, validate critical environment variables and fail fast if missing
const requiredProdEnvs = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

if (isProd) {
  const missing = requiredProdEnvs.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('❌ Missing required production environment variables:', missing.join(', '));
    console.error('Aborting startup to avoid running with insecure defaults.');
    process.exit(1);
  }
}

// CORS configuration - MUST be first middleware
// Enhanced CORS configuration
const allowedOrigins = [
  'https://gharfr.vercel.app',
  'https://ghar-02ex.onrender.com',
  ...(isProd ? [] : ['http://localhost:3000'])
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Fallback CORS error handler (ensures CORS headers on errors)
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next(err);
});

// Capture errors via Sentry and forward
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Compression middleware
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  message: 'Too many requests, please try again later.'
}));

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
  ,
  isEmailVerified: { type: Boolean, default: false }
});

const pgSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: String,
  location: {
    city: { type: String, index: true },
    address: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  price: {
    monthly: Number,
    security: Number
  },
  amenities: [String],
  images: [String],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  isApproved: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
}, { 
  strict: false,
  timestamps: true
});

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PG', index: true },
  userName: String,
  pgName: String,
  totalAmount: Number,
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending',
    index: true
  },
  checkIn: { type: Date, index: true },
  checkOut: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// Create models
const User = mongoose.model('User', userSchema);
const PG = mongoose.model('PG', pgSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    req.user = user;
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

// Initialize demo data
const initializeData = async () => {
  try {
    // Skip demo seeding in production unless explicitly enabled
    if (isProd && !process.env.ENABLE_DEMO) {
      console.log('Production mode: demo data seeding skipped (set ENABLE_DEMO=true to override)');
      return;
    }

    const adminExists = await User.findOne({ email: 'admin@ghar.com' });
    if (adminExists) {
      console.log('✅ Demo data already exists');
      return;
    }

    console.log('Creating demo data...');
    const salt = await bcrypt.genSalt(10);
    
    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@ghar.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });
    
    // Create owner user
    const owner = await User.create({
      name: 'PG Owner',
      email: 'owner@ghar.com',
      password: await bcrypt.hash('owner123', salt),
      role: 'owner',
      isActive: true,
      isEmailVerified: true
    });
    
    // Create regular user
    const user = await User.create({
      name: 'Demo User',
      email: 'user@demo.com',
      password: await bcrypt.hash('demo123', salt),
      role: 'user',
      isActive: true,
      isEmailVerified: true
    });
    
    // Create demo PG
    const pg = await PG.create({
      name: 'Sunrise PG',
      description: 'Comfortable PG for students',
      location: { 
        city: 'Mumbai', 
        address: 'Andheri West, Mumbai',
        state: 'Maharashtra',
        pincode: '400058',
        coordinates: { latitude: 19.1136, longitude: 72.8697 }
      },
      price: { monthly: 12000, security: 6000 },
      amenities: ['WiFi', 'Food', 'Laundry', 'Security'],
      images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop'],
      owner: owner._id,
      status: 'approved',
      isApproved: true,
      isActive: true
    });
    
    // Create demo booking
    await Booking.create({
      userId: user._id,
      pgId: pg._id,
      userName: 'Demo User',
      pgName: 'Sunrise PG',
      totalAmount: 12000,
      status: 'confirmed',
      checkIn: new Date('2024-02-01'),
      checkOut: new Date('2024-08-01')
    });
    
    console.log('✅ Demo data created successfully');
    console.log('👤 Admin login: admin@ghar.com / admin123');
    console.log('👤 Owner login: owner@ghar.com / owner123');
    console.log('👤 User login: user@demo.com / demo123');
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Create middleware module
const middlewareModule = { authMiddleware, adminMiddleware, ownerMiddleware };

// Make middleware available to route files
app.set('middleware', middlewareModule);
app.set('jwtSecret', JWT_SECRET);

// Import route files
const authRoutes = require('./routes/auth');
const pgRoutes = require('./routes/pgs');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// Connect to MongoDB and start server
async function startServer() {
  try {
    console.log(`🔄 Connecting to MongoDB...`);
    
    // Start an in-memory MongoDB if requested (USE_IN_MEMORY_DB=true)
    if (process.env.USE_IN_MEMORY_DB === 'true' && MongoMemoryServer) {
      console.log('Starting in-memory MongoDB instance for server (USE_IN_MEMORY_DB=true)');
      __INMEM_MONGOD = await MongoMemoryServer.create();
      MONGODB_URI = __INMEM_MONGOD.getUri();
    }

    // Connect with retry logic
    let retries = 5;
    while (retries) {
      try {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 15000,
          socketTimeoutMS: 60000,
          family: 4, // Use IPv4
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        
        // Test the connection with a simple query
        await mongoose.connection.db.admin().ping();
        break;
      } catch (err) {
        console.log(`❌ MongoDB connection attempt failed, retries left: ${retries}`);
        console.error('Connection error details:', err.message);
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`✅ MongoDB connected successfully`);
    
    // Initialize data
    await initializeData();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${NODE_ENV}`);
      console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
      console.log(`🗄️ MongoDB: CONNECTED`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    if (__INMEM_MONGOD) {
      await __INMEM_MONGOD.stop();
    }
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep the process running in production
  if (!isProd) {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Keep the process running in production
  if (!isProd) {
    process.exit(1);
  }
});

// Start the server
startServer();