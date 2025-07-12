// Check environment variables on production
console.log('=== RENDER ENVIRONMENT CHECK ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Test JWT token creation
if (process.env.JWT_SECRET) {
  const jwt = require('jsonwebtoken');
  try {
    const testToken = jwt.sign({ test: 'data' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ JWT creation works');
    
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    console.log('✅ JWT verification works');
  } catch (error) {
    console.log('❌ JWT error:', error.message);
  }
} else {
  console.log('❌ JWT_SECRET is missing!');
}