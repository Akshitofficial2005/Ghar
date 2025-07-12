const mongoose = require('mongoose');
const Amenity = require('../models/Amenity');
require('dotenv').config();

const seedAmenities = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing amenities
    await Amenity.deleteMany({});
    console.log('Cleared existing amenities');

    // Sample amenities data
    const amenities = [
      {
        name: 'WiFi',
        description: 'High-speed internet connectivity',
        monthlyCharge: 0,
        icon: '📶',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Food/Meals',
        description: 'Home-cooked meals included',
        monthlyCharge: 3000,
        icon: '🍽️',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Laundry',
        description: 'Washing and cleaning services',
        monthlyCharge: 500,
        icon: '👕',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Parking',
        description: 'Dedicated parking space',
        monthlyCharge: 1000,
        icon: '🚗',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Air Conditioning',
        description: 'Personal AC in room',
        monthlyCharge: 2000,
        icon: '❄️',
        category: 'premium',
        isActive: true
      },
      {
        name: 'Power Backup',
        description: '24/7 power backup facility',
        monthlyCharge: 500,
        icon: '🔋',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Security',
        description: '24/7 security and CCTV',
        monthlyCharge: 0,
        icon: '🛡️',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Gym/Fitness',
        description: 'On-site fitness facilities',
        monthlyCharge: 1500,
        icon: '💪',
        category: 'premium',
        isActive: true
      },
      {
        name: 'Mini Fridge',
        description: 'Personal refrigerator in room',
        monthlyCharge: 1500,
        icon: '🧊',
        category: 'premium',
        isActive: true
      },
      {
        name: 'Study Table',
        description: 'Dedicated study space',
        monthlyCharge: 0,
        icon: '📚',
        category: 'basic',
        isActive: true
      },
      {
        name: 'Wardrobe',
        description: 'Personal wardrobe space',
        monthlyCharge: 0,
        icon: '👔',
        category: 'basic',
        isActive: true
      },
      {
        name: 'TV/Entertainment',
        description: 'Television and entertainment',
        monthlyCharge: 800,
        icon: '📺',
        category: 'premium',
        isActive: true
      },
      {
        name: 'Swimming Pool',
        description: 'Access to swimming pool',
        monthlyCharge: 2500,
        icon: '🏊',
        category: 'luxury',
        isActive: true
      },
      {
        name: 'Housekeeping',
        description: 'Daily room cleaning service',
        monthlyCharge: 1000,
        icon: '🧹',
        category: 'premium',
        isActive: true
      },
      {
        name: 'Water Purifier',
        description: 'RO water purification',
        monthlyCharge: 300,
        icon: '💧',
        category: 'basic',
        isActive: true
      }
    ];

    // Insert amenities
    await Amenity.insertMany(amenities);
    console.log(`Successfully seeded ${amenities.length} amenities`);

    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding amenities:', error);
    process.exit(1);
  }
};

seedAmenities();
