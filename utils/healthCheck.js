const mongoose = require('mongoose');
const axios = require('axios');

const healthCheck = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  try {
    // Database check
    if (mongoose.connection.readyState === 1) {
      results.services.database = { status: 'connected', message: 'MongoDB connected' };
    } else {
      results.services.database = { status: 'disconnected', message: 'MongoDB disconnected' };
      results.status = 'unhealthy';
    }

    // Razorpay check (if keys are configured)
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      results.services.razorpay = { status: 'configured', message: 'Razorpay keys configured' };
    } else {
      results.services.razorpay = { status: 'not_configured', message: 'Razorpay keys missing' };
    }

    // Cloudinary check
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      results.services.cloudinary = { status: 'configured', message: 'Cloudinary configured' };
    } else {
      results.services.cloudinary = { status: 'not_configured', message: 'Cloudinary not configured' };
    }

    // Environment check
    results.services.environment = {
      status: 'ok',
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    };

  } catch (error) {
    results.status = 'unhealthy';
    results.error = error.message;
  }

  return results;
};

module.exports = healthCheck;