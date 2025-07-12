const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'https://ghar-02ex.onrender.com/api';

async function testDirectly() {
  try {
    console.log('=== Direct 401 Test ===\n');
    
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful:', { email: user.email, role: user.role });
    
    // Step 2: Test admin PGs endpoint directly
    console.log('\n2. Testing admin PGs endpoint...');
    const pgsResponse = await axios.get(`${API_BASE_URL}/admin/pgs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Admin PGs response:', {
      totalPGs: pgsResponse.data.total,
      pgsCount: pgsResponse.data.pgs.length
    });
    
    // Step 3: Test with pending status
    console.log('\n3. Testing with pending status...');
    const pendingResponse = await axios.get(`${API_BASE_URL}/admin/pgs?status=pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Pending PGs:', {
      total: pendingResponse.data.total,
      count: pendingResponse.data.pgs.length
    });
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDirectly();