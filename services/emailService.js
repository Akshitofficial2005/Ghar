const nodemailer = require('nodemailer');
const { getEmailTransporter, hasEmailConfig, getEmailFrom, getEmailProvider } = require('./emailTransport');
const logger = require('../utils/logger');

const transporter = getEmailTransporter();

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function sendWithRetry(mailOptions, attempts = 3) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (err) {
      lastErr = err;
      logger.warn('Email send attempt %d failed: %o', i + 1, err.message || err);
      // exponential backoff
      await sleep(500 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  if (!transporter) {
    logger.error('Email configuration missing: set EMAIL_HOST/EMAIL_USER/EMAIL_PASS or SENDGRID_API_KEY');
    return false;
  }

  try {
    const mailOptions = {
      from: getEmailFrom(),
      to: email,
      subject: 'Ghar App - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Email Verification</h2>
          <p>Thank you for registering with Ghar App. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    const info = await sendWithRetry(mailOptions, 3);
    logger.info('OTP email sent via %s', getEmailProvider() || 'email');
    return true;
  } catch (error) {
    logger.error('Error sending email: %o', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  hasEmailConfig
};