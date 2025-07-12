const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'https://ghar-02ex.onrender.com/api';

async function testPGCreation() {
  try {
    console.log('=== Testing PG Creation Fix ===\n');
    
    // Step 1: Login as admin (who can create PGs)
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful:', { email: user.email, role: user.role });
    
    // Step 2: Test PG creation with proper schema data
    console.log('\n2. Testing PG creation...');
    const testPGData = {
      name: 'Test PG - ' + Date.now(),
      description: 'Test PG for debugging 401 issue',
      location: {
        address: 'Test Address, Test Area',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      images: [{
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        isMain: true
      }],
      roomTypes: [{
        type: 'single',
        price: 5000,
        deposit: 2000,
        totalRooms: 5,
        availableRooms: 3
      }, {
        type: 'double',
        price: 7000,
        deposit: 3000,
        totalRooms: 3,
        availableRooms: 2
      }],
      amenities: {
        wifi: true,
        parking: true,
        food: false,
        gym: false,
        ac: false,
        laundry: true,
        security: true,
        powerBackup: false
      },
      rules: ['No smoking', 'No pets', 'Visitors allowed till 9 PM']
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/pgs`, testPGData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PG created successfully:', {
      id: createResponse.data.pg._id,
      name: createResponse.data.pg.name,
      status: createResponse.data.pg.isApproved ? 'Approved' : 'Pending'
    });
    
    console.log('\n🎉 PG creation test passed! The 401 issue is fixed.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testPGCreation();