const mongoose = require('mongoose');
const PG = require('./models/PG');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function testPGCreation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully!');
    console.log('Connection state:', mongoose.connection.readyState);
    
    // Create a test PG
    const testPG = new PG({
      name: 'Test PG ' + Date.now(),
      description: 'This is a test PG created to verify database connectivity',
      location: {
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      roomTypes: [{
        type: 'single',
        price: 5000,
        deposit: 2500,
        totalRooms: 5,
        availableRooms: 3
      }],
      amenities: {
        wifi: true,
        food: true
      },
      isApproved: true,
      isActive: true
    });
    
    console.log('Saving test PG...');
    const savedPG = await testPG.save();
    console.log('Test PG saved successfully!');
    console.log('PG ID:', savedPG._id);
    
    // Verify by retrieving the PG
    const retrievedPG = await PG.findById(savedPG._id);
    console.log('Retrieved PG:', retrievedPG.name);
    
    // Clean up - delete the test PG
    await PG.findByIdAndDelete(savedPG._id);
    console.log('Test PG deleted');
    
    // List all PGs
    const allPGs = await PG.find().select('name location.city isApproved');
    console.log('All PGs in database:', allPGs.length);
    allPGs.forEach(pg => {
      console.log(`- ${pg.name} (${pg.location.city}) - Approved: ${pg.isApproved}`);
    });
    
    await mongoose.connection.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPGCreation();