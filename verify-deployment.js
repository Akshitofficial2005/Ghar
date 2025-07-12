const axios = require('axios');

async function verifyDeployment() {
  try {
    console.log('🔍 Verifying deployment...');
    
    // Test health endpoint
    const healthResponse = await axios.get('https://ghar-02ex.onrender.com/api/health');
    console.log('✅ Backend health:', healthResponse.data.message);
    
    // Test debug endpoint (if it exists)
    try {
      const debugResponse = await axios.get('https://ghar-02ex.onrender.com/api/debug-auth');
      console.log('✅ Debug endpoint available');
    } catch (e) {
      console.log('ℹ️ Debug endpoint not available (expected)');
    }
    
    console.log('\n🚀 Backend deployment verified!');
    console.log('⏰ Wait 2-3 minutes for full deployment, then try creating PG again.');
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
  }
}

verifyDeployment();