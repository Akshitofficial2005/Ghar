const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'https://ghar-02ex.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5001/api';

async function testAuth() {
  try {
    console.log('=== Testing 401 Authentication Issue ===\n');
    
    // Step 1: Test server health
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is healthy:', healthResponse.data);
    
    // Step 2: Login as admin
    console.log('\n2. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful:', { email: user.email, role: user.role });
    console.log('Token received:', token.substring(0, 20) + '...');
    
    // Step 3: Test debug auth endpoint
    console.log('\n3. Testing debug auth endpoint...');
    const debugResponse = await axios.get(`${API_BASE_URL}/debug-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Debug auth response:', debugResponse.data);
    
    // Step 4: Test admin PGs endpoint
    console.log('\n4. Testing admin PGs endpoint...');
    const pgsResponse = await axios.get(`${API_BASE_URL}/admin/pgs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Admin PGs response:', {
      totalPGs: pgsResponse.data.total,
      pgsCount: pgsResponse.data.pgs.length
    });
    
    // Step 5: Test with status filter
    console.log('\n5. Testing admin PGs with pending status...');
    const pendingPgsResponse = await axios.get(`${API_BASE_URL}/admin/pgs?status=pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Pending PGs response:', {
      totalPending: pendingPgsResponse.data.total,
      pendingCount: pendingPgsResponse.data.pgs.length
    });
    
    console.log('\n🎉 All tests passed! The 401 issue should be resolved.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
    
    // Additional debugging
    if (error.response?.status === 401) {
      console.log('\n🔍 401 Error Debug Info:');
      console.log('- Check if admin user exists in database');
      console.log('- Verify JWT_SECRET is correct');
      console.log('- Ensure token is being sent correctly');
      console.log('- Check auth middleware logs');
    }
  }
}

testAuth();