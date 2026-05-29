const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Google OAuth removed
const User = require('../New folder (2)/backend/models/User');
const { authMiddleware } = require('../New folder (2)/backend/middleware/auth');
const { getEmailTransporter, hasEmailConfig, getEmailFrom, getEmailProvider } = require('../New folder (2)/backend/services/emailTransport');

const router = express.Router();

// Google OAuth removed: no client or validation

const emailTransporter = getEmailTransporter();

// Email sending function
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  if (!emailTransporter) {
    console.error('Email configuration missing: set EMAIL_HOST/EMAIL_USER/EMAIL_PASS or GMAIL_USER/GMAIL_APP_PASSWORD');
    return false;
  }
  
  const resetLink = `${process.env.FRONTEND_URL || 'https://gharfr.vercel.app'}/reset-password?token=${resetToken}`;
  
  const emailOptions = {
    from: getEmailFrom() || 'noreply@gharapp.com',
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
    console.log(`Password reset email sent via ${getEmailProvider() || 'email'} to: ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Import OTP model and email service
const OTP = require('../New folder (2)/backend/models/OTP');
const { generateOTP, sendOTPEmail } = require('../New folder (2)/backend/services/emailService');

// Request OTP for registration
router.post('/register/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (!hasEmailConfig) {
      return res.status(503).json({ message: 'Email service is not configured' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to database (replace if exists)
    await OTP.findOneAndDelete({ email });
    await new OTP({ email, otp }).save();
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }
    
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP and register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'user', otp } = req.body;
    const requireOtp = process.env.REQUIRE_REGISTRATION_OTP !== 'false';

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    if (requireOtp) {
      if (!otp) {
        return res.status(400).json({ message: 'OTP is required' });
      }

      const otpRecord = await OTP.findOne({ email });
      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP expired or not requested' });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Delete OTP record
      await OTP.findOneAndDelete({ email });
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
      role,
      isEmailVerified: true
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024',
      { expiresIn: '7d' } // Extended to 7 days
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || '',
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified
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
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      if (!hasEmailConfig) {
        return res.status(503).json({
          message: 'Email service is not configured',
          requiresVerification: true,
          email: user.email
        });
      }

      // Generate new OTP for verification
      const otp = generateOTP();
      await OTP.findOneAndDelete({ email });
      await new OTP({ email, otp }).save();
      
      // Send OTP email
      const emailSent = await sendOTPEmail(email, otp);
      if (!emailSent) {
        return res.status(503).json({
          message: 'Failed to send verification email',
          requiresVerification: true,
          email: user.email
        });
      }
      
      return res.status(403).json({ 
        message: 'Email not verified', 
        requiresVerification: true,
        email: user.email
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024',
      { expiresIn: '7d' } // Extended to 7 days
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar || '',
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user is populated by authMiddleware and already has all user data
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
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
      // To prevent user enumeration, we send a success response even if user doesn't exist.
      return res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024',
      { expiresIn: '1h' }
    );

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);
    if (!emailSent) {
      // Log the error but don't expose it to the client
      console.error(`Failed to send password reset email to ${user.email}`);
    }
    
    res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Generic error for the client
    res.status(500).json({ message: 'An error occurred while attempting to send the reset email.' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024');
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

// Google auth endpoint removed

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (temporary endpoint for fixing 401 issues)
router.put('/update-role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Allow users to set their own role to 'owner' (for testing)
    if (!['user', 'owner', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { role }, 
      { new: true }
    ).select('-password');
    
    console.log(`User ${user._id} role updated to: ${role}`);
    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Save OTP to database (replace if exists)
    await OTP.findOneAndDelete({ email });
    await new OTP({ email, otp }).save();
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }
    
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP for existing users
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify OTP
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not requested' });
    }
    
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Delete OTP record
    await OTP.findOneAndDelete({ email });
    
    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Token refresh endpoint
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    // If we reach here, the token is valid (authMiddleware passed)
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new JWT token
    const newToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
