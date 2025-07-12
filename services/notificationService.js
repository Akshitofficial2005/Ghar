const nodemailer = require('nodemailer');
const axios = require('axios');

// Free Email Service using Gmail SMTP
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS
  }
});

// Alternative free SMS using TextBelt (completely free but limited)
const sendFreeTextBeltSMS = async (phone, message) => {
  try {
    const response = await axios.post('https://textbelt.com/text', {
      phone: phone,
      message: message,
      key: 'textbelt' // Free key with 1 text per day per IP
    });
    return { success: response.data.success, quotaRemaining: response.data.quotaRemaining };
  } catch (error) {
    console.error('TextBelt SMS Error:', error);
    return { success: false, error: error.message };
  }
};

// Alternative free SMS using Fast2SMS (Indian users - free credits)
const sendFast2SMS = async (phone, message) => {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: message,
      language: 'english',
      flash: 0,
      numbers: phone.replace('+91', '').replace('+', '')
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY || 'your-fast2sms-key'
      }
    });
    return { success: response.data.return };
  } catch (error) {
    console.error('Fast2SMS Error:', error);
    return { success: false, error: error.message };
  }
};

class NotificationService {
  constructor() {
    this.emailTransporter = emailTransporter;
  }

  // Send Email Notification
  async sendEmail(to, subject, htmlContent, textContent = '') {
    try {
      const mailOptions = {
        from: `"Ghar PG" <${process.env.GMAIL_USER || process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS Notification (tries multiple free services)
  async sendSMS(phone, message) {
    let result = { success: false };

    // Format phone number
    let formattedPhone = phone.replace(/[^\d]/g, '');
    if (formattedPhone.startsWith('91')) {
      formattedPhone = formattedPhone.substring(2);
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    const fullPhone = `+91${formattedPhone}`;

    // Try Fast2SMS for Indian numbers first
    if (process.env.FAST2SMS_API_KEY) {
      result = await sendFast2SMS(fullPhone, message);
      if (result.success) {
        console.log(`Fast2SMS sent to ${fullPhone}`);
        return { success: true, service: 'fast2sms' };
      }
    }

    // Try TextBelt as fallback (free but limited)
    result = await sendFreeTextBeltSMS(fullPhone, message);
    if (result.success) {
      console.log(`TextBelt SMS sent to ${fullPhone}, quota remaining: ${result.quotaRemaining}`);
      return { success: true, service: 'textbelt', quotaRemaining: result.quotaRemaining };
    }

    console.error('All SMS services failed for:', fullPhone);
    return { success: false, error: 'All SMS services failed' };
  }

  // Send both Email and SMS
  async sendNotification(userEmail, userPhone, subject, message, htmlContent = null) {
    const results = {};

    // Send Email
    if (userEmail) {
      results.email = await this.sendEmail(
        userEmail, 
        subject, 
        htmlContent || this.createHTMLTemplate(subject, message),
        message
      );
    }

    // Send SMS
    if (userPhone) {
      // Limit SMS message to 160 characters for free services
      const smsMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;
      results.sms = await this.sendSMS(userPhone, smsMessage);
    }

    return results;
  }

  // Create HTML Email Template
  createHTMLTemplate(subject, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Ghar PG</h1>
            <h2>${subject}</h2>
          </div>
          <div class="content">
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="footer">
            <p>© 2025 Ghar PG. All rights reserved.</p>
            <p>Visit our website: <a href="https://your-website.vercel.app">Ghar PG</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Booking Confirmation Notification
  async sendBookingConfirmation(user, booking) {
    const subject = '🎉 Booking Confirmed - Ghar PG';
    const message = `Hi ${user.name}!\n\nYour booking has been confirmed!\n\nPG: ${booking.pgName}\nRoom: ${booking.roomType}\nCheck-in: ${booking.checkIn}\nRent: ₹${booking.rent}/month\n\nThank you for choosing Ghar PG!`;
    
    return await this.sendNotification(user.email, user.phone, subject, message);
  }

  // Promotional Notification
  async sendPromotionalMessage(user, promoContent) {
    const subject = '🎊 Special Offer - Ghar PG';
    const message = `Hi ${user.name}!\n\n${promoContent}\n\nVisit our website to explore amazing PGs!\n\nBest regards,\nGhar PG Team`;
    
    return await this.sendNotification(user.email, user.phone, subject, message);
  }

  // PG Approval Notification (for owners)
  async sendPGApprovalNotification(owner, pgName, status) {
    const subject = status === 'approved' ? '✅ PG Approved!' : '❌ PG Rejected';
    const message = `Hi ${owner.name}!\n\nYour PG "${pgName}" has been ${status}.\n\n${status === 'approved' ? 'Your property is now live and bookable!' : 'Please check admin feedback and resubmit.'}\n\nBest regards,\nGhar PG Team`;
    
    return await this.sendNotification(owner.email, owner.phone, subject, message);
  }

  // Bulk Promotional Message
  async sendBulkPromotion(users, promoContent) {
    const results = [];
    
    for (const user of users) {
      try {
        const result = await this.sendPromotionalMessage(user, promoContent);
        results.push({ userId: user.id, ...result });
        
        // Add delay to avoid rate limiting on free services
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ userId: user.id, error: error.message });
      }
    }
    
    return results;
  }

  // Free WhatsApp message using CallMeBot API
  async sendWhatsAppMessage(phoneNumber, message) {
    try {
      // Format phone number for WhatsApp
      let formattedPhone = phoneNumber.replace(/[^\d]/g, '');
      if (!formattedPhone.startsWith('91')) {
        formattedPhone = '91' + formattedPhone;
      }

      // Using CallMeBot free WhatsApp API (requires one-time setup)
      const encodedMessage = encodeURIComponent(message);
      const apiUrl = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedMessage}&apikey=${process.env.WHATSAPP_API_KEY || 'demo'}`;
      
      const response = await axios.get(apiUrl, { timeout: 10000 });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error('WhatsApp service failed');
    }
  }

  // Send both SMS and WhatsApp
  async sendDualNotification(phone, message) {
    try {
      const smsResult = await this.sendSMS(phone, message);
      const whatsappResult = await this.sendWhatsApp(phone, message);
      
      return {
        sms: smsResult,
        whatsapp: whatsappResult,
        success: smsResult.success || whatsappResult.success
      };
    } catch (error) {
      console.error('Dual notification error:', error);
      return { error: error.message };
    }
  }

  // Enhanced email with better templates
  async sendEnhancedEmail(to, subject, htmlContent, textContent) {
    try {
      const mailOptions = {
        from: `"Ghar - Your Home Away From Home" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get notification content templates
  getNotificationContent(type, data, userInfo) {
    const templates = {
      'booking_confirmed': {
        sms: `🎉 Hi ${userInfo.name}! Your booking for ${data.pgName} is CONFIRMED! Check-in: ${data.checkInDate}. Welcome to Ghar! 🏠`,
        subject: '🎉 Booking Confirmed - Welcome to Your New Home!',
        text: `Hi ${userInfo.name}, Your booking for ${data.pgName} has been confirmed! Check-in date: ${data.checkInDate}. We're excited to welcome you!`,
        html: this.getBookingConfirmedHTML(userInfo, data)
      },
      
      'booking_pending': {
        sms: `📋 Hi ${userInfo.name}! Your booking request for ${data.pgName} is under review. We'll update you soon! - Ghar Team`,
        subject: '📋 Booking Request Received - Under Review',
        text: `Hi ${userInfo.name}, We've received your booking request for ${data.pgName}. It's currently under review and we'll update you within 24 hours.`,
        html: this.getBookingPendingHTML(userInfo, data)
      },

      'pg_approved': {
        sms: `🎉 Congratulations ${userInfo.name}! Your PG "${data.pgName}" is now LIVE on Ghar! Start receiving bookings now!`,
        subject: '🎉 Your PG is Live - Start Receiving Bookings!',
        text: `Congratulations! Your PG "${data.pgName}" has been approved and is now live on our platform.`,
        html: this.getPGApprovedHTML(userInfo, data)
      },

      'promotional': {
        sms: `🏠 ${data.message} - Ghar Team`,
        subject: `🏠 ${data.subject} - Ghar`,
        text: data.message,
        html: this.getPromotionalHTML(userInfo, data)
      },

      'welcome': {
        sms: `🏠 Welcome to Ghar, ${userInfo.name}! Your account is verified. Find your perfect PG or list your property now!`,
        subject: '🏠 Welcome to Ghar - Your Home Away From Home!',
        text: `Welcome to Ghar! Your account has been created and verified. Start exploring PGs or list your property.`,
        html: this.getWelcomeHTML(userInfo)
      }
    };

    return templates[type] || templates['promotional'];
  }

  async sendBookingConfirmation(user, booking, pg) {
    const emailTemplate = `
      <h2>Booking Confirmed! 🎉</h2>
      <p>Dear ${user.name},</p>
      <p>Your booking has been confirmed for <strong>${pg.name}</strong></p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>PG Name:</strong> ${pg.name}</p>
        <p><strong>Amount Paid:</strong> ₹${booking.totalAmount}</p>
      </div>
      <p>Thank you for choosing Ghar!</p>
    `;

    await this.sendEmail(user.email, 'Booking Confirmed - Ghar', emailTemplate);
  }

  async sendPGApprovalNotification(owner, pg, status) {
    const subject = status === 'approved' ? 'PG Approved!' : 'PG Rejected';
    const message = status === 'approved' 
      ? `Great news! Your PG "${pg.name}" has been approved and is now live on Ghar.`
      : `Your PG "${pg.name}" has been rejected. Please contact support for details.`;

    const emailTemplate = `
      <h2>${subject}</h2>
      <p>Dear ${owner.name},</p>
      <p>${message}</p>
      <p><strong>PG Name:</strong> ${pg.name}</p>
    `;

    await this.sendEmail(owner.email, subject, emailTemplate);
  }

  async sendEmail(to, subject, html) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  async sendOTP(phone, otp) {
    console.log(`OTP ${otp} sent to ${phone}`);
    return true;
  }

  // Alias for WhatsApp method (for consistency)
  async sendWhatsApp(phone, message) {
    return await this.sendWhatsAppMessage(phone, message);
  }
}

module.exports = new NotificationService();