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
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Increase payload size limits for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        
        const user = users.find(u => u.id === decoded.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' });

        req.user = user;
        next();
    });
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
publicRouter.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.use('/api', publicRouter);

// 2. Auth Routes
const authRouter = express.Router();
authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
app.use('/api/auth', authRouter);

// 3. PG Routes (User Auth Required)
const pgRouter = express.Router();
pgRouter.use(authMiddleware);
pgRouter.post('/', (req, res) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only owners or admins can create PGs' });
    }
    const newPG = { id: `pg-${Date.now()}`, ...req.body, owner: req.user.id, status: 'pending', createdAt: new Date().toISOString() };
    mockPGs.push(newPG);
    res.status(201).json(newPG);
});
app.use('/api/pgs', pgRouter);

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
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
};

initializeServer();
