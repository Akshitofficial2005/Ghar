// Test script to check backend health and forgot password endpoint
const testBackendHealth = async () => {
  console.log('🔍 Testing Backend Health and Forgot Password...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await fetch('https://ghar-02ex.onrender.com/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthData.status);

    // Test 2: Forgot password endpoint
    console.log('\n2️⃣ Testing forgot password endpoint...');
    const forgotPasswordResponse = await fetch('https://ghar-02ex.onrender.com/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });

    if (forgotPasswordResponse.ok) {
      const forgotPasswordData = await forgotPasswordResponse.json();
      console.log('✅ Forgot password endpoint working:', forgotPasswordData.message);
    } else {
      console.log('❌ Forgot password endpoint failed:', forgotPasswordResponse.status, forgotPasswordResponse.statusText);
      const errorText = await forgotPasswordResponse.text();
      console.log('Error details:', errorText);
    }

    // Test 3: CORS check
    console.log('\n3️⃣ Testing CORS headers...');
    console.log('CORS Origin allowed:', forgotPasswordResponse.headers.get('Access-Control-Allow-Origin'));

  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }

  console.log('\n🏁 Backend tests completed!');
};

// Run the tests
testBackendHealth();
