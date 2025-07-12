const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const User = require('../models/User');

// Send promotional notification to specific user
router.post('/send-promo/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { promoContent } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await notificationService.sendPromotionalMessage(user, promoContent);
    
    res.json({
      success: true,
      message: 'Promotional notification sent',
      results: result
    });
  } catch (error) {
    console.error('Send promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send bulk promotional notifications to all users
router.post('/send-bulk-promo', async (req, res) => {
  try {
    const { promoContent, userType } = req.body; // userType: 'all', 'users', 'owners'

    let query = {};
    if (userType === 'users') query.role = 'user';
    if (userType === 'owners') query.role = 'owner';

    const users = await User.find(query).limit(100); // Limit to avoid overwhelming free services
    
    const results = await notificationService.sendBulkPromotion(users, promoContent);
    
    res.json({
      success: true,
      message: `Bulk promotional notifications sent to ${users.length} users`,
      results: results
    });
  } catch (error) {
    console.error('Bulk promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send booking confirmation
router.post('/booking-confirmation', async (req, res) => {
  try {
    const { userId, bookingDetails } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await notificationService.sendBookingConfirmation(user, bookingDetails);
    
    res.json({
      success: true,
      message: 'Booking confirmation sent',
      results: result
    });
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send PG approval notification
router.post('/pg-approval', async (req, res) => {
  try {
    const { ownerId, pgName, status } = req.body;

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const result = await notificationService.sendPGApprovalNotification(owner, pgName, status);
    
    res.json({
      success: true,
      message: 'PG approval notification sent',
      results: result
    });
  } catch (error) {
    console.error('PG approval notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test notification (for admin testing)
router.post('/test', async (req, res) => {
  try {
    const { email, phone, testMessage } = req.body;

    const result = await notificationService.sendNotification(
      email,
      phone,
      '🧪 Test Notification - Ghar PG',
      testMessage || 'This is a test notification from Ghar PG system!'
    );
    
    res.json({
      success: true,
      message: 'Test notification sent',
      results: result
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notification service status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    services: {
      email: {
        enabled: !!process.env.EMAIL_USER,
        provider: 'Gmail SMTP'
      },
      sms: {
        enabled: true,
        providers: [
          { name: 'Fast2SMS', enabled: !!process.env.FAST2SMS_API_KEY },
          { name: 'TextBelt', enabled: true, note: 'Free but limited to 1 SMS per day per IP' }
        ]
      },
      whatsapp: {
        enabled: !!process.env.WHATSAPP_API_KEY,
        provider: 'CallMeBot API'
      }
    }
  });
});

module.exports = router;
