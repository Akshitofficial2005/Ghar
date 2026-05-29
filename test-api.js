const axios = require('axios');

// Test the PG API
async function testPGAPI() {
  try {
    console.log('Testing PG API...');
    
    // Test GET /api/pgs
    console.log('Testing GET /api/pgs');
    const response = await axios.get('http://localhost:5001/api/pgs');
    
    console.log('Response status:', response.status);
    console.log('PGs found:', response.data.data?.length || 0);
    console.log('Success:', response.data.success);
    
    if (response.data.success) {
      console.log('✅ PG API is working!');
    } else {
      console.log('❌ PG API returned success: false');
    }
  } catch (error) {
    console.error('❌ Error testing PG API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPGAPI();