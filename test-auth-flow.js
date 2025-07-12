const axios = require('axios');
require('dotenv').config();

async function testAuthFlow() {
  try {
    console.log('🔍 Testing complete auth flow...');
    
    // Step 1: Check environment
    console.log('\n1. Environment Check:');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('Admin email:', process.env.ADMIN_EMAIL);
    
    // Step 2: Login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post('https://ghar-02ex.onrender.com/api/auth/login', {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful:', user.email, user.role);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Step 3: Test token with debug endpoint
    console.log('\n3. Testing token validation...');
    const debugResponse = await axios.get('https://ghar-02ex.onrender.com/api/debug-auth', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Token validation:', debugResponse.data.success ? 'PASSED' : 'FAILED');
    
    // Step 4: Test PG creation
    console.log('\n4. Testing PG creation...');
    const pgData = {
      name: 'Auth Test PG',
      description: 'Testing auth flow',
      location: { address: 'Test', city: 'Test', state: 'Test', pincode: '123456' },
      roomTypes: [{ type: 'single', price: 5000, deposit: 2000, totalRooms: 1, availableRooms: 1 }],
      amenities: { wifi: true, parking: false, food: false, gym: false, ac: false, laundry: false, security: false, powerBackup: false },
      images: [{ url: 'data:image/png;base64,test', isMain: true }],
      rules: ['Test rule']
    };
    
    const pgResponse = await axios.post('https://ghar-02ex.onrender.com/api/pgs', pgData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PG creation successful:', pgResponse.data.message);
    console.log('\n🎉 All tests passed! Auth flow is working.');
    
  } catch (error) {
    console.error('\n❌ Test failed at step:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 401 Error Troubleshooting:');
      console.log('1. Check if JWT_SECRET is set in Render environment');
      console.log('2. Verify user has correct role (owner/admin)');
      console.log('3. Check if token is being sent correctly');
    }
  }
}

testAuthFlow();