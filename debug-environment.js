// Environment debug endpoint - test JWT_SECRET availability on Render
const express = require('express');
const jwt = require('jsonwebtoken');

// Add this to your server.js or create a debug route
const debugEnvironment = (req, res) => {
  try {
    const envStatus = {
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV,
      jwt_secret_exists: !!process.env.JWT_SECRET,
      jwt_secret_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      jwt_secret_first_chars: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) + '...' : 'Not set',
      database_url_exists: !!process.env.DATABASE_URL,
      google_client_id_exists: !!process.env.GOOGLE_CLIENT_ID,
      render_service_name: process.env.RENDER_SERVICE_NAME || 'Not on Render'
    };

    // Test JWT token creation and verification
    try {
      const testPayload = { test: true, timestamp: Date.now() };
      const testToken = jwt.sign(testPayload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'fallback_secret');
      
      envStatus.jwt_test = {
        token_creation: 'SUCCESS',
        token_verification: 'SUCCESS',
        decoded_payload: decoded
      };
    } catch (jwtError) {
      envStatus.jwt_test = {
        error: jwtError.message,
        status: 'FAILED'
      };
    }

    res.json({
      status: 'Environment Debug',
      data: envStatus
    });
  } catch (error) {
    res.status(500).json({
      error: 'Environment check failed',
      message: error.message
    });
  }
};

// Export for use in routes
module.exports = { debugEnvironment };

// If running directly, create a simple server
if (require.main === module) {
  const app = express();
  app.get('/debug-env', debugEnvironment);
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Environment debug server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}/debug-env`);
  });
}
