/**
 * Test script to debug PG creation issues
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api'; // Test local fixed version

// Test data similar to what frontend sends
const testPGData = {
  name: "Test PG Listing - " + Date.now(),
  description: "This is a test PG for debugging",
  location: {
    address: "Test Address, Test City",
    city: "Test City",
    state: "Test State", 
    pincode: "123456"
  },
  images: [
    {
      url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8=",
      isMain: true
    }
  ],
  roomTypes: [
    {
      type: "single",
      price: 8000,
      deposit: 4000,
      totalRooms: 5,
      availableRooms: 3
    }
  ],
  amenities: {
    wifi: true,
    food: true,
    parking: false,
    security: true,
    gym: false,
    ac: false,
    laundry: false,
    powerBackup: false
  },
  rules: ["No smoking", "No pets", "Quiet hours after 10 PM"]
};

async function testHealthCheck() {
  try {
    console.log('🏥 Testing Health Check...');
    
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 10000
    });
    
    console.log('✅ Health Check Success:', response.status);
    console.log('📥 Response:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Health Check Error:', error.response?.status, error.message);
    return false;
  }
}

async function testSimplePGCreation() {
  try {
    console.log('\n🧪 Testing Simple PG Creation...');
    
    const simplePGData = {
      name: "Simple Test PG - " + Date.now(),
      location: "Test City, Test State",
      pricePerMonth: 8000,
      description: "Simple test description"
    };
    
    console.log('📤 Sending simple data:', JSON.stringify(simplePGData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/pgs`, simplePGData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PG-Test-Script/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ Simple API Success:', response.status);
    console.log('📥 Response:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Simple API Error:', error.response?.status, error.response?.statusText);
    console.error('📥 Error Response:', error.response?.data);
    return false;
  }
}

async function testComplexPGCreation() {
  try {
    console.log('\n🧪 Testing Complex PG Creation...');
    console.log('📤 Sending complex data:', JSON.stringify(testPGData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/pgs`, testPGData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PG-Test-Script/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ Complex API Success:', response.status);
    console.log('📥 Response:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Complex API Error:', error.response?.status, error.response?.statusText);
    console.error('📥 Error Response:', error.response?.data);
    console.error('🔍 Error Details:', error.message);
    
    if (error.response) {
      console.error('📋 Response Headers:', error.response.headers);
    }
    return false;
  }
}

async function testWithAuth() {
  try {
    console.log('\n🔐 Testing with Authentication...');
    
    // Login as admin first
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@ghar.com',
      password: 'admin123'
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful:', { email: user.email, role: user.role });
    
    // Create PG with auth token
    const response = await axios.post(`${API_BASE_URL}/pgs`, testPGData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'PG-Test-Script/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ Authenticated PG Creation Success:', response.status);
    console.log('📥 Response:', response.data);
    return true;
    
  } catch (error) {
    console.error('❌ Authenticated API Error:', error.response?.status, error.response?.statusText);
    console.error('📥 Error Response:', error.response?.data);
    return false;
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting PG Creation Debug Tests...\n');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, skipping other tests');
    return;
  }
  
  const simpleOk = await testSimplePGCreation();
  const complexOk = await testComplexPGCreation();
  const authOk = await testWithAuth();
  
  console.log('\n📊 Test Results:');
  console.log('- Health Check:', healthOk ? '✅' : '❌');
  console.log('- Simple PG Creation:', simpleOk ? '✅' : '❌');
  console.log('- Complex PG Creation:', complexOk ? '✅' : '❌');
  console.log('- Authenticated PG Creation:', authOk ? '✅' : '❌');
  
  if (simpleOk || complexOk || authOk) {
    console.log('\n🎉 At least one test passed - the backend is working!');
  } else {
    console.log('\n💥 All tests failed - there may be a backend issue');
  }
}

runAllTests();