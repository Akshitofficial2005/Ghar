/**
 * Ghar Backend Server - MongoDB Fix
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Hardcoded MongoDB URI as fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Gharwebapp:akshitMayank2003@cluster0.9eetoaf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024';

// Log environment variables
console.log('Environment Variables:');
console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('MongoDB URI:', MONGODB_URI.substring(0, 20) + '...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('MongoDB Connection State:', mongoose.connection.readyState);
    
    // Create test user
    try {
      const testUser = await User.findOne({ email: 'test@example.com' });
      if (!testUser) {
        await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: await bcrypt.hash('password123', 10),
          role: 'user'
        });
        console.log('✅ Test user created');
      } else {
        console.log('✅ Test user already exists');
      }
    } catch (userError) {
      console.error('❌ Error creating test user:', userError);
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🗄️ MongoDB: CONNECTED`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Start the server
startServer();