// Check environment variables on production
console.log('=== RENDER ENVIRONMENT CHECK ===');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'MISSING');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('FRONTEND_URL exists:', !!process.env.FRONTEND_URL);
console.log('EMAIL_HOST or GMAIL_USER exists:', !!process.env.EMAIL_HOST || !!process.env.GMAIL_USER);
console.log('EMAIL_USER or GMAIL_USER exists:', !!process.env.EMAIL_USER || !!process.env.GMAIL_USER);
console.log('EMAIL_PASS or GMAIL_APP_PASSWORD exists:', !!process.env.EMAIL_PASS || !!process.env.GMAIL_APP_PASSWORD);
console.log('RAZORPAY configured:', !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET));
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

const missing = [];
if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL');
if (!(process.env.EMAIL_HOST || process.env.GMAIL_USER)) missing.push('EMAIL_HOST or GMAIL_USER');
if (!(process.env.EMAIL_USER || process.env.GMAIL_USER)) missing.push('EMAIL_USER or GMAIL_USER');
if (!(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD)) missing.push('EMAIL_PASS or GMAIL_APP_PASSWORD');

if (missing.length) {
  console.log('❌ Missing production env vars:', missing.join(', '));
} else {
  console.log('✅ Production env vars look complete');
}