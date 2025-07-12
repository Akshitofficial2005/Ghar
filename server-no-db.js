const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
// const { connectDB } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = 5001;

// Connect to MongoDB - commented out for no-db version
// connectDB();

// Email configuration
const createEmailTransporter = () => {
  // Check if production email settings are available
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // For development/testing, use Gmail with app passwords or ethereal
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
  
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
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

// Mock amenities data
const mockAmenities = [
  {
    _id: '1',
    name: 'WiFi',
    description: 'High-speed internet connectivity',
    monthlyCharge: 0,
    icon: '📶',
    category: 'basic',
    isActive: true
  },
  {
    _id: '2',
    name: 'Food/Meals',
    description: 'Home-cooked meals included',
    monthlyCharge: 3000,
    icon: '🍽️',
    category: 'basic',
    isActive: true
  },
  {
    _id: '3',
    name: 'Laundry',
    description: 'Washing and cleaning services',
    monthlyCharge: 500,
    icon: '👕',
    category: 'basic',
    isActive: true
  },
  {
    _id: '4',
    name: 'Parking',
    description: 'Dedicated parking space',
    monthlyCharge: 1000,
    icon: '🚗',
    category: 'basic',
    isActive: true
  },
  {
    _id: '5',
    name: 'Air Conditioning',
    description: 'Personal AC in room',
    monthlyCharge: 2000,
    icon: '❄️',
    category: 'premium',
    isActive: true
  },
  {
    _id: '6',
    name: 'Power Backup',
    description: '24/7 power backup facility',
    monthlyCharge: 500,
    icon: '🔋',
    category: 'basic',
    isActive: true
  },
  {
    _id: '7',
    name: 'Security',
    description: '24/7 security and CCTV',
    monthlyCharge: 0,
    icon: '🛡️',
    category: 'basic',
    isActive: true
  },
  {
    _id: '8',
    name: 'Gym/Fitness',
    description: 'On-site fitness facilities',
    monthlyCharge: 1500,
    icon: '💪',
    category: 'premium',
    isActive: true
  },
  {
    _id: '9',
    name: 'Mini Fridge',
    description: 'Personal refrigerator in room',
    monthlyCharge: 1500,
    icon: '🧊',
    category: 'premium',
    isActive: true
  },
  {
    _id: '10',
    name: 'Study Table',
    description: 'Dedicated study space',
    monthlyCharge: 0,
    icon: '📚',
    category: 'basic',
    isActive: true
  }
];

// Mock data for admin dashboard
const mockPGs = [
  {
    id: 'pg-1',
    name: 'Sunrise PG',
    location: 'Indore, MP',
    status: 'pending',
    price: 12000,
    images: ['https://via.placeholder.com/400x300'],
    owner: 'John Doe',
    createdAt: '2024-01-20T10:30:00Z'
  },
  {
    id: 'pg-2', 
    name: 'Comfort Villa',
    location: 'Mumbai, MH',
    status: 'approved',
    price: 15000,
    images: ['https://via.placeholder.com/400x300'],
    owner: 'Sarah Johnson',
    createdAt: '2024-01-18T09:15:00Z'
  },
  {
    id: 'pg-3',
    name: 'Student Hub',
    location: 'Delhi, DL',
    status: 'pending',
    price: 8000,
    images: ['https://via.placeholder.com/400x300'],
    owner: 'Mike Wilson',
    createdAt: '2024-01-19T16:45:00Z'
  },
  {
    id: 'pg-4',
    name: 'City Center PG',
    location: 'Pune, MH',
    status: 'approved',
    price: 18000,
    images: ['https://via.placeholder.com/400x300'],
    owner: 'Alex Kumar',
    createdAt: '2024-01-17T14:20:00Z'
  },
  {
    id: 'pg-5',
    name: 'Green Valley PG',
    location: 'Bangalore, KA',
    status: 'rejected',
    price: 14000,
    images: ['https://via.placeholder.com/400x300'],
    owner: 'Rahul Sharma',
    createdAt: '2024-01-16T11:00:00Z'
  }
];

// In-memory users storage
let users = [];

// Helper functions for user persistence (mock for no-db mode)
const saveUsers = () => {
  // In no-db mode, just keep in memory
  console.log(`Saved ${users.length} users to memory`);
};

const loadUsers = () => {
  // In no-db mode, users start empty and are populated by demo accounts
  return users;
};

// Add demo accounts with pre-hashed passwords
const initializeDemoAccounts = async () => {
  // Check if demo accounts already exist
  const hasAdmin = users.find(u => u.email === 'admin@gharapp.com');
  if (hasAdmin) {
    console.log('Demo accounts already exist');
    return;
  }

  const demoAccounts = [
    { name: 'Admin User', email: 'admin@gharapp.com', password: 'admin123', role: 'admin' },
    { name: 'PG Owner', email: 'owner@gharapp.com', password: 'owner123', role: 'owner' },
    { name: 'Demo User', email: 'user@demo.com', password: 'demo123', role: 'user' }
  ];

  for (const account of demoAccounts) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(account.password, salt);
    
    users.push({
      id: `demo-${account.role}`,
      name: account.name,
      email: account.email,
      password: hashedPassword,
      phone: '',
      role: account.role,
      createdAt: new Date().toISOString()
    });
  }
  
  saveUsers(); // Save to file
  console.log('Demo accounts initialized:', users.map(u => ({ email: u.email, role: u.role })));
};

// Initialize demo accounts
initializeDemoAccounts();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api', generalLimiter);

// CORS configuration with enhanced security
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all active amenities
app.get('/api/amenities', (req, res) => {
  try {
    const activeAmenities = mockAmenities.filter(amenity => amenity.isActive);
    res.json(activeAmenities);
  } catch (error) {
    console.error('Get amenities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'user' } = req.body;

    // Check if user exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(); // Save to file

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google auth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }
    
    // Parse the JWT token
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    
    // Check if user exists, if not create one
    let user = users.find(u => u.email === payload.email);
    
    if (!user) {
      user = {
        id: payload.sub || Date.now().toString(),
        name: payload.name || 'Google User',
        email: payload.email,
        role: 'user',
        phone: '',
        createdAt: new Date().toISOString(),
        googleAuth: true
      };
      users.push(user);
      saveUsers(); // Save to file
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token (simplified for demo)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // In production, this would send an email with the reset link
    // For demo purposes, we'll just log it and return success
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link would be: http://localhost:3000/reset-password?token=${resetToken}`);
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send password reset email' });
    }
    
    res.json({ 
      message: 'Password reset email sent successfully',
      // In demo mode, include the token for testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    // Verify the reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    
    // Find user by ID
    const userIndex = users.findIndex(u => u.id === decoded.userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    users[userIndex].password = hashedPassword;
    saveUsers(); // Save to file
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin endpoints
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    totalPGs: 156,
    pendingApprovals: 12,
    totalUsers: 1248,
    revenue: 125000
  });
});

app.get('/api/admin/pgs', (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  let filteredPGs = mockPGs;
  
  if (status) {
    filteredPGs = mockPGs.filter(pg => pg.status === status);
  }
  
  res.json({
    pgs: filteredPGs,
    total: filteredPGs.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

app.put('/api/admin/pgs/:id/approve', (req, res) => {
  const { id } = req.params;
  
  // Find the PG and update its status
  const pgIndex = mockPGs.findIndex(pg => pg.id === id);
  if (pgIndex !== -1) {
    mockPGs[pgIndex].status = 'approved';
    mockPGs[pgIndex].approvedAt = new Date().toISOString();
  }
  
  console.log(`Approving PG: ${id}`);
  res.json({ success: true, message: 'PG approved successfully' });
});

app.put('/api/admin/pgs/:id/reject', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  // Find the PG and update its status
  const pgIndex = mockPGs.findIndex(pg => pg.id === id);
  if (pgIndex !== -1) {
    mockPGs[pgIndex].status = 'rejected';
    mockPGs[pgIndex].rejectionReason = reason;
    mockPGs[pgIndex].rejectedAt = new Date().toISOString();
  }
  
  console.log(`Rejecting PG: ${id}, Reason: ${reason}`);
  res.json({ success: true, message: 'PG rejected successfully' });
});

// Admin Users Management
app.get('/api/admin/users', (req, res) => {
  const { page = 1, limit = 10, role } = req.query;
  let filteredUsers = users;
  
  if (role) {
    filteredUsers = users.filter(user => user.role === role);
  }
  
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    users: paginatedUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      createdAt: user.createdAt || '2024-01-01T00:00:00Z'
    })),
    total: filteredUsers.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

app.put('/api/admin/users/:id/toggle-status', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  user.isActive = !user.isActive;
  console.log(`Toggled user ${id} status to: ${user.isActive ? 'active' : 'inactive'}`);
  
  res.json({ 
    success: true, 
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive
    }
  });
});

// Admin Bookings Management
app.get('/api/admin/bookings', (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  // Mock bookings data
  const mockBookings = [
    {
      id: '1',
      userId: '1',
      pgId: '1',
      userName: 'John Doe',
      pgName: 'Sunrise PG',
      totalAmount: 15000,
      status: 'confirmed',
      checkIn: '2024-02-01',
      checkOut: '2024-02-28',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      userId: '2',
      pgId: '2',
      userName: 'Jane Smith',
      pgName: 'Comfort Villa',
      totalAmount: 12000,
      status: 'pending',
      checkIn: '2024-02-05',
      checkOut: '2024-03-05',
      createdAt: '2024-01-18T14:30:00Z'
    },
    {
      id: '3',
      userId: '3',
      pgId: '3',
      userName: 'Mike Johnson',
      pgName: 'Student Hub',
      totalAmount: 18000,
      status: 'completed',
      checkIn: '2024-01-01',
      checkOut: '2024-01-31',
      createdAt: '2024-01-01T09:00:00Z'
    },
    {
      id: '4',
      userId: '1',
      pgId: '4',
      userName: 'John Doe',
      pgName: 'City Center PG',
      totalAmount: 20000,
      status: 'cancelled',
      checkIn: '2024-02-15',
      checkOut: '2024-03-15',
      createdAt: '2024-01-20T16:45:00Z'
    }
  ];
  
  let filteredBookings = mockBookings;
  
  if (status) {
    filteredBookings = mockBookings.filter(booking => booking.status === status);
  }
  
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
  
  res.json({
    bookings: paginatedBookings,
    total: filteredBookings.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

// Admin Analytics Endpoints
app.get('/api/admin/analytics/revenue', (req, res) => {
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Platform Revenue',
      data: [120000, 145000, 168000, 182000, 210000, 235000],
      backgroundColor: 'rgba(147, 51, 234, 0.8)',
      borderColor: 'rgba(147, 51, 234, 1)',
    }]
  };
  res.json(revenueData);
});

app.get('/api/admin/analytics/users', (req, res) => {
  const userGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Students',
        data: [1200, 1450, 1680, 1820, 2100, 2350],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
      {
        label: 'Owners',
        data: [25, 30, 35, 42, 48, 55],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
      }
    ]
  };
  res.json(userGrowthData);
});

app.get('/api/admin/analytics/bookings', (req, res) => {
  const bookingStatusData = {
    labels: ['Confirmed', 'Pending', 'Cancelled', 'Completed'],
    datasets: [{
      data: [65, 15, 8, 12],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
      ]
    }]
  };
  res.json(bookingStatusData);
});

// System Health and Alerts
app.get('/api/admin/system/alerts', (req, res) => {
  const systemAlerts = [
    {
      id: '1',
      type: 'warning',
      message: 'Payment gateway latency increased by 15%',
      timestamp: '2024-01-20T11:00:00Z',
      resolved: false
    },
    {
      id: '2',
      type: 'info',
      message: 'Database maintenance scheduled for tonight',
      timestamp: '2024-01-20T10:00:00Z',
      resolved: false
    },
    {
      id: '3',
      type: 'error',
      message: 'SMS service temporarily unavailable',
      timestamp: '2024-01-20T09:30:00Z',
      resolved: true
    }
  ];
  res.json({ alerts: systemAlerts });
});

app.put('/api/admin/system/alerts/:id/resolve', (req, res) => {
  const { id } = req.params;
  console.log(`Resolving alert: ${id}`);
  res.json({ success: true, message: 'Alert resolved successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT} (No Database Mode)`);
  console.log('Using in-memory storage for testing');
});
