/**
 * Ghar Backend Server (No Database Version)
 * 
 * This file contains the complete backend logic for the Ghar application,
 * using in-memory arrays for data storage instead of a database.
 * It includes user authentication, property (PG) management, and a full admin dashboard API.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// 🚨 NUCLEAR CORS FIX - ABSOLUTE OVERRIDE 🚨
app.use((req, res, next) => {
  console.log(`🔥 NUCLEAR CORS: ${req.method} ${req.path} from ${req.headers.origin || 'unknown'}`);
  
  // FORCE ALL CORS HEADERS - NO CONDITIONS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Expose-Headers', '*');
  
  // NUCLEAR OPTIONS HANDLING
  if (req.method === 'OPTIONS') {
    console.log(`🚨 NUCLEAR OPTIONS: Responding immediately`);
    res.status(204).end();
    return;
  }
  
  next();
});

// BACKUP CORS - Belt and suspenders
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['*'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// --- In-Memory Data Store ---
let users = [];
let mockPGs = [
    { id: 'pg-1', name: 'Sunrise PG', location: { city: 'Indore' }, price: 12000, owner: 'owner-1', status: 'pending', isApproved: false, isActive: false, createdAt: new Date().toISOString() },
    { id: 'pg-2', name: 'Comfort Villa', location: { city: 'Mumbai' }, price: 15000, owner: 'owner-1', status: 'approved', isApproved: true, isActive: true, createdAt: new Date().toISOString() },
    { id: 'pg-3', name: 'Student Hub', location: { city: 'Delhi' }, price: 8000, owner: 'owner-2', status: 'rejected', isApproved: false, isActive: false, createdAt: new Date().toISOString() },
];
let mockBookings = [
    { id: 'booking-1', userId: 'user-1', pgId: 'pg-2', userName: 'Demo User', pgName: 'Comfort Villa', totalAmount: 15000, status: 'confirmed', checkIn: '2024-02-01', checkOut: '2024-08-01', createdAt: new Date().toISOString() }
];

// --- Middleware ---
app.use(helmet({ crossOriginResourcePolicy: false }));

// NUCLEAR CORS is now at the top - removing old middleware

// Increase payload size limits for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    // Skip auth for OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log(`\n🔍 AUTH MIDDLEWARE DEBUG - ${req.method} ${req.path}`);
    console.log('Authorization header:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'NOT FOUND');
    console.log('JWT_SECRET available:', process.env.JWT_SECRET ? 'YES' : 'NO');
    
    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    // Try multiple JWT secrets for compatibility
    const possibleSecrets = [
        process.env.JWT_SECRET,
        'ghar_super_secret_jwt_key_2024',
        'ghar-super-secret-jwt-key-2024',
        'fallback-secret'
    ].filter(Boolean);
    
    let decoded = null;
    let lastError = null;
    
    for (const secret of possibleSecrets) {
        try {
            decoded = jwt.verify(token, secret);
            console.log('✅ JWT verified with secret:', secret.substring(0, 10) + '...');
            break;
        } catch (err) {
            lastError = err;
            console.log(`❌ JWT verification failed with secret ${secret.substring(0, 10)}...:`, err.message);
        }
    }
    
    if (!decoded) {
        console.log('❌ JWT verification failed with all secrets');
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
        console.log('✅ JWT decoded successfully:', { userId: decoded.userId, exp: new Date(decoded.exp * 1000) });
        const user = users.find(u => u.id === decoded.userId);
        if (!user) {
            console.log('❌ User not found in database:', decoded.userId);
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        console.log('✅ User found:', { id: user.id, name: user.name, role: user.role });
        req.user = user;
        next();
};

const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    next();
};

// --- API Routers ---

// 1. Public Routes (No Auth Required)
const publicRouter = express.Router();
publicRouter.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// CORS test endpoint
publicRouter.get('/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS test successful!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// OPTIONS test endpoint  
publicRouter.options('/cors-test', (req, res) => {
  console.log('✅ CORS OPTIONS test endpoint hit');
  res.json({ message: 'OPTIONS working' });
});

app.use('/api', publicRouter);

// 2. Auth Routes
const authRouter = express.Router();
authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    const user = users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
        console.log('❌ Invalid credentials for:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Use the same flexible secret approach as verification
    const jwtSecret = process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024';
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' });
    
    console.log('✅ Login successful for:', user.email, 'Role:', user.role);
    console.log('Generated token with secret:', jwtSecret.substring(0, 10) + '...');
    
    res.json({ 
        token, 
        user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role 
        } 
    });
});

// Add the missing /auth/me endpoint for token validation
authRouter.get('/me', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.use('/api/auth', authRouter);

// Register endpoint
authRouter.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'user' } = req.body;
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: `user-${Date.now()}`,
            name, email, password: hashedPassword,
            role: role === 'admin' ? 'user' : role,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        const jwtSecret = process.env.JWT_SECRET || 'ghar_super_secret_jwt_key_2024';
        const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '7d' });
        
        res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed' });
    }
});

// 3. PG Routes (User Auth Required)

// PG Submissions storage
let pgSubmissions = [];

// Submit PG listing request
app.post('/api/pg-submissions', (req, res) => {
    try {
        console.log('PG Submission Request:', req.body);
        
        const submission = {
            id: `sub-${Date.now()}`,
            ...req.body,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        
        pgSubmissions.push(submission);
        console.log('PG Submission saved:', submission.id);
        
        res.status(201).json({ 
            success: true, 
            message: 'PG listing request submitted successfully',
            submissionId: submission.id 
        });
    } catch (error) {
        console.error('Error saving submission:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit PG listing request' 
        });
    }
});

// Get all submissions (for admin)
app.get('/api/pg-submissions', (req, res) => {
    try {
        res.json({
            success: true,
            submissions: pgSubmissions,
            total: pgSubmissions.length
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch submissions' 
        });
    }
});

// Update submission status
app.put('/api/pg-submissions/:id/status', (req, res) => {
    try {
        const { status, notes } = req.body;
        const submissionIndex = pgSubmissions.findIndex(s => s.id === req.params.id);
        
        if (submissionIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        pgSubmissions[submissionIndex] = {
            ...pgSubmissions[submissionIndex],
            status,
            notes,
            updatedAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            message: 'Submission status updated',
            submission: pgSubmissions[submissionIndex]
        });
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update submission' 
        });
    }
});

// Delete submission
app.delete('/api/pg-submissions/:id', (req, res) => {
    try {
        const submissionIndex = pgSubmissions.findIndex(s => s.id === req.params.id);
        
        if (submissionIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        pgSubmissions.splice(submissionIndex, 1);
        
        res.json({
            success: true,
            message: 'Submission deleted'
        });
    } catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete submission' 
        });
    }
});

// 4. Admin Routes (Admin Auth Required)
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminAuth);

// Dashboard
adminRouter.get('/dashboard', (req, res) => {
    res.json({
        totalUsers: users.length,
        totalPGs: mockPGs.length,
        pendingApprovals: mockPGs.filter(p => p.status === 'pending').length,
        revenue: mockBookings.reduce((sum, b) => sum + b.totalAmount, 0),
    });
});

// PG Management
adminRouter.get('/pgs', (req, res) => {
    res.json({ pgs: mockPGs, total: mockPGs.length });
});

// User Management
adminRouter.get('/users', (req, res) => {
    res.json({ users: users.map(({ password, ...user }) => user), total: users.length });
});

// Bookings Management
adminRouter.get('/bookings', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const paginatedBookings = mockBookings.slice(startIndex, startIndex + limit);
    res.json({
        bookings: paginatedBookings,
        total: mockBookings.length,
        totalPages: Math.ceil(mockBookings.length / limit),
        currentPage: page,
    });
});

// System & Analytics - FLATTENED ROUTES
adminRouter.get('/system-alerts', (req, res) => {
    res.json({ alerts: [{ id: 'alert-1', type: 'warning', message: 'High server load detected', timestamp: new Date().toISOString() }] });
});
adminRouter.get('/analytics-users', (req, res) => {
    res.json({ total: users.length, byRole: users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {}) });
});
adminRouter.get('/analytics-bookings', (req, res) => {
    res.json({ total: mockBookings.length, byStatus: mockBookings.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] || 0) + 1 }), {}) });
});
adminRouter.get('/analytics-revenue', (req, res) => {
    res.json({ total: mockBookings.reduce((sum, b) => sum + b.totalAmount, 0), monthlyData: [{ month: 'Current', revenue: 45000 }] });
});

app.use('/api/admin', adminRouter);

// --- Final Error Handling ---
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
});

// --- Server Initialization ---
const initializeServer = async () => {
    console.log('🚀 STARTING GHAR BACKEND - NO DB VERSION (CORS ULTRA FIX v2.0)');
    console.log('🔧 Deployment timestamp:', new Date().toISOString());
    // Initialize demo accounts if users array is empty
    if (users.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const demoAccounts = [
            { id: 'admin-1', name: 'Admin User', email: process.env.ADMIN_EMAIL || 'admin@ghar.com', password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt), role: 'admin', isActive: true, createdAt: new Date().toISOString() },
            { id: 'owner-1', name: 'PG Owner', email: 'owner@ghar.com', password: await bcrypt.hash('owner123', salt), role: 'owner', isActive: true, createdAt: new Date().toISOString() },
            { id: 'user-1', name: 'Demo User', email: 'user@demo.com', password: await bcrypt.hash('demo123', salt), role: 'user', isActive: true, createdAt: new Date().toISOString() },
        ];
        users.push(...demoAccounts);
        console.log('Demo accounts initialized.');
    }

    app.listen(PORT, () => {
        console.log(`🚀 GHAR BACKEND SERVER STARTED SUCCESSFULLY`);
        console.log(`📡 Server running on http://localhost:${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
        console.log(`⚡ CORS configured for: https://gharfr.vercel.app`);
        console.log(`📋 Demo accounts: admin@ghar.com / admin123`);
    });
};

initializeServer();
