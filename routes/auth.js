const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Email configuration
const createEmailTransporter = () => {
  // Check for Gmail configuration first
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  
  // Fallback: no email sending (development mode)
  return null;
};

const emailTransporter = createEmailTransporter();

// Email sending function
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  if (!emailTransporter) {
    console.log(`[DEV MODE] Password reset email would be sent to: ${email}`);
    console.log(`[DEV MODE] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
    return true;
  }
  
  const resetLink = `${process.env.FRONTEND_URL || 'https://gharfr.vercel.app'}/reset-password?token=${resetToken}`;
  
  const emailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@gharapp.com',
    to: email,
    subject: 'Reset Your Ghar App Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Reset Your Password</h2>
        <p>Hello ${userName},</p>
        <p>You requested to reset your password for your Ghar App account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>${resetLink}
        </p>
      </div>
    `
  };
  
  try {
    await emailTransporter.sendMail(emailOptions);
    console.log(`Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'user' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token (simplified)
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send password reset email' });
    }
    
    res.json({ message: 'Password reset email sent successfully' });
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send password reset email' });
    }
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Invalid token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// Google auth endpoint
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }
    
    // Parse the JWT token
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    
    // Return user data
    res.json({
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: 'user',
        phone: '',
        createdAt: new Date().toISOString()
      },
      token: 'auth_token_' + Date.now()
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;