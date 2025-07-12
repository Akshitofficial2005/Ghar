const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PG = require('../models/PG');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await PG.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      phone: '9907002817',
      role: 'admin'
    });
    await adminUser.save();

    // Create sample owner
    const ownerUser = new User({
      name: 'PG Owner',
      email: 'owner@gharapp.com',
      password: 'owner123',
      phone: '9876543210',
      role: 'owner'
    });
    await ownerUser.save();

    // Create sample PGs in Indore
    const samplePGs = [
      {
        name: 'Ghar Sunrise - Boys Only',
        description: 'A comfortable and affordable PG accommodation for working professionals and students. Located in the heart of the city with excellent connectivity.',
        images: [
          'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
        ],
        location: {
          address: '123 MG Road',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          coordinates: { lat: 22.7196, lng: 75.8577 }
        },
        amenities: {
          wifi: true,
          food: true,
          laundry: true,
          parking: true,
          gym: false,
          ac: true,
          powerBackup: true,
          security: true
        },
        roomTypes: [
          {
            type: 'single',
            price: 12000,
            deposit: 24000,
            availableRooms: 3,
            totalRooms: 5,
            amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'],
            images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'],
            gender: 'male'
          },
          {
            type: 'double',
            price: 8000,
            deposit: 16000,
            availableRooms: 2,
            totalRooms: 8,
            amenities: ['Shared Bathroom', 'Study Table', 'Wardrobe'],
            images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
            gender: 'male'
          }
        ],
        extraAmenities: [
          { name: 'Air Conditioning', description: 'Personal AC in room', monthlyCharge: 2000, icon: '❄️' },
          { name: 'Mini Fridge', description: 'Personal refrigerator', monthlyCharge: 1500, icon: '🧊' }
        ],
        rules: [
          'No smoking or drinking allowed',
          'Visitors allowed till 9 PM',
          'Maintain cleanliness',
          'No loud music after 10 PM'
        ],
        owner: ownerUser._id,
        ownerName: 'PG Owner',
        ownerPhone: '9876543210',
        rating: 4.5,
        reviewCount: 23,
        isApproved: true
      },
      {
        name: 'Ghar Green Valley - Girls Only',
        description: 'Safe and secure accommodation for girls with 24/7 security, CCTV surveillance, and homely food.',
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop'
        ],
        location: {
          address: '456 Vijay Nagar',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          coordinates: { lat: 22.7532, lng: 75.8937 }
        },
        amenities: {
          wifi: true,
          food: true,
          laundry: true,
          parking: false,
          gym: true,
          ac: true,
          powerBackup: true,
          security: true
        },
        roomTypes: [
          {
            type: 'single',
            price: 15000,
            deposit: 30000,
            availableRooms: 1,
            totalRooms: 3,
            amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe', 'Balcony'],
            images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop'],
            gender: 'female'
          }
        ],
        rules: [
          'Only for girls',
          'No male visitors allowed',
          'Curfew at 10 PM',
          'No smoking or drinking'
        ],
        owner: ownerUser._id,
        ownerName: 'PG Owner',
        ownerPhone: '9876543210',
        rating: 4.8,
        reviewCount: 45,
        isApproved: true
      }
    ];

    await PG.insertMany(samplePGs);
    console.log('Sample data seeded successfully');

    console.log('\n=== SEEDED DATA ===');
    console.log('Admin Login: admin@gharapp.com / admin123');
    console.log('Owner Login: owner@gharapp.com / owner123');
    console.log('Sample PGs: 2 properties in Indore');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();