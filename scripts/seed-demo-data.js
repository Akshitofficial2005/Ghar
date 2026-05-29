require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const PG = require('../models/PG');
const Booking = require('../models/Booking');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedDemoData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');


    // 1. Find existing user
    const user = await User.findOne({ email: 'user@demo.com' });
    if (!user) {
      throw new Error('Demo user with email user@demo.com not found. Please create the user first.');
    }
    console.log('👤 Using existing user:', user.email);

    // 2. Create demo PG
    const pg = await PG.create({
      name: 'Sunrise Residency',
      description: 'A comfortable PG for students and professionals.',
      owner: user._id,
      location: {
        address: '123 Main Street',
        city: 'Indore',
        state: 'MP',
        pincode: '452001',
        coordinates: [75.8577, 22.7196]
      },
      price: 8000,
      totalRooms: 10,
      availableRooms: 5,
      amenities: ['wifi', 'meals', 'ac', 'laundry', 'parking'],
      status: 'pending',
      images: [],
      createdAt: new Date()
    });
    console.log('🏠 Demo PG created:', pg.name);

    // 3. Create demo booking
    const booking = await Booking.create({
      userId: user._id,
      pgId: pg._id,
      roomTypeId: new mongoose.Types.ObjectId(),
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      guests: 1,
      totalAmount: 8000,
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date()
    });
    console.log('📅 Demo booking created:', booking._id);

    await mongoose.disconnect();
    console.log('✅ Demo data seeded and disconnected.');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

seedDemoData();
