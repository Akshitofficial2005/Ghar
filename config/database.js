const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ghar-pg', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
    await seedInitialData();
    
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedInitialData = async () => {
  try {
    const User = require('../models/User');

    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        phone: '9907002817',
        role: 'admin',
        isVerified: true
      });
      await admin.save();
      console.log('Admin user created');
    }

    const ownerExists = await User.findOne({ email: 'owner@gharapp.com' });
    if (!ownerExists) {
      const owner = new User({
        name: 'Sample Owner',
        email: 'owner@gharapp.com',
        password: 'owner123',
        phone: '9876543210',
        role: 'owner',
        isVerified: true
      });
      await owner.save();
      console.log('Sample owner created');
    }

  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

const createIndexes = async () => {
  try {
    const User = require('../models/User');
    const PG = require('../models/PG');
    const Booking = require('../models/Booking');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phone: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    // PG indexes
    await PG.collection.createIndex({ 'location.city': 1 });
    await PG.collection.createIndex({ 'location.coordinates': '2dsphere' });
    await PG.collection.createIndex({ status: 1 });
    await PG.collection.createIndex({ owner: 1 });
    await PG.collection.createIndex({ 'roomTypes.price': 1 });
    await PG.collection.createIndex({ rating: -1 });
    await PG.collection.createIndex({ createdAt: -1 });

    // Booking indexes
    await Booking.collection.createIndex({ userId: 1 });
    await Booking.collection.createIndex({ pgId: 1 });
    await Booking.collection.createIndex({ status: 1 });
    await Booking.collection.createIndex({ checkIn: 1, checkOut: 1 });
    await Booking.collection.createIndex({ createdAt: -1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = connectDB;