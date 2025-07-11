const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PG = require('../models/PG');
require('dotenv').config();

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ghar', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('\n💡 Solutions:');
    console.log('1. Start MongoDB: mongod --dbpath "C:\\data\\db"');
    console.log('2. Use MongoDB Atlas (cloud)');
    console.log('3. Check if port 27017 is free');
    process.exit(1);
  }
};

const seedRealData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await PG.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Admin',
      email: 'admin@gharapp.com',
      password: adminPassword,
      phone: '9907002817',
      role: 'admin',
      isVerified: true
    });
    await admin.save();

    // Create sample owners
    const ownerPassword = await bcrypt.hash('owner123', 10);
    const owners = [];
    
    for (let i = 1; i <= 5; i++) {
      const owner = new User({
        name: `Owner ${i}`,
        email: `owner${i}@gharapp.com`,
        password: ownerPassword,
        phone: `987654321${i}`,
        role: 'owner',
        isVerified: true
      });
      await owner.save();
      owners.push(owner);
    }

    // Real PG data
    const realPGData = [
      {
        name: 'Sunrise Boys PG',
        description: 'Modern PG accommodation for working professionals and students.',
        owner: owners[0]._id,
        location: {
          address: '123 MG Road, Near City Mall',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001'
        },
        images: [
          { url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', isMain: true }
        ],
        roomTypes: [
          {
            type: 'single',
            price: 12000,
            deposit: 6000,
            totalRooms: 10,
            availableRooms: 7
          },
          {
            type: 'double',
            price: 8000,
            deposit: 4000,
            totalRooms: 15,
            availableRooms: 12
          }
        ],
        amenities: {
          wifi: true,
          food: true,
          parking: true,
          gym: true,
          ac: true,
          laundry: true,
          security: true,
          powerBackup: true
        },
        rating: {
          overall: 4.5,
          cleanliness: 4.6,
          safety: 4.7,
          location: 4.3,
          valueForMoney: 4.4,
          staff: 4.5
        },
        reviewCount: 25,
        isApproved: true,
        isActive: true,
        isFeatured: true
      },
      {
        name: 'Green Valley Girls PG',
        description: 'Safe and secure accommodation for girls with 24/7 security.',
        owner: owners[1]._id,
        location: {
          address: '456 Vijay Nagar, Near DAVV University',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010'
        },
        images: [
          { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', isMain: true }
        ],
        roomTypes: [
          {
            type: 'double',
            price: 9000,
            deposit: 4500,
            totalRooms: 20,
            availableRooms: 15
          }
        ],
        amenities: {
          wifi: true,
          food: true,
          parking: false,
          gym: false,
          ac: false,
          laundry: true,
          security: true,
          powerBackup: true
        },
        rating: {
          overall: 4.2,
          cleanliness: 4.3,
          safety: 4.8,
          location: 4.0,
          valueForMoney: 4.1,
          staff: 4.2
        },
        reviewCount: 18,
        isApproved: true,
        isActive: true
      },
      {
        name: 'Tech Hub PG',
        description: 'Premium PG near IT companies with high-speed internet.',
        owner: owners[2]._id,
        location: {
          address: '789 Electronic City',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560100'
        },
        images: [
          { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', isMain: true }
        ],
        roomTypes: [
          {
            type: 'single',
            price: 15000,
            deposit: 7500,
            totalRooms: 8,
            availableRooms: 5
          }
        ],
        amenities: {
          wifi: true,
          food: true,
          parking: true,
          gym: true,
          ac: true,
          laundry: true,
          security: true,
          powerBackup: true
        },
        rating: {
          overall: 4.7,
          cleanliness: 4.8,
          safety: 4.6,
          location: 4.9,
          valueForMoney: 4.5,
          staff: 4.7
        },
        reviewCount: 32,
        isApproved: true,
        isActive: true,
        isFeatured: true
      }
    ];

    // Insert PGs
    await PG.insertMany(realPGData);
    
    console.log('✅ Real data seeded successfully!');
    console.log(`Created ${owners.length} owners and ${realPGData.length} PGs`);
    
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runSeeding = async () => {
  await connectDB();
  await seedRealData();
};

runSeeding();