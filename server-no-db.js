const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const notificationService = require('./services/notificationService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// --- Mock Data ---
let users = [];
let mockPGs = [
    { id: 'pg-1', name: 'Sunrise PG', description: 'A comfortable PG for working professionals', location: { address: '123 MG Road', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001' }, roomTypes: [{ type: 'single', price: 12000, deposit: 6000, totalRooms: 10, availableRooms: 7 }], amenities: { wifi: true, food: true, parking: true }, images: [{ url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', isMain: true }], owner: 'demo-owner', isApproved: false, isActive: false, status: 'pending', createdAt: '2024-01-20T10:30:00Z' },
    { id: 'pg-2', name: 'Comfort Villa', description: 'Modern accommodation in prime location', location: { address: '456 Linking Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' }, roomTypes: [{ type: 'double', price: 15000, deposit: 7500, totalRooms: 8, availableRooms: 5 }], amenities: { wifi: true, food: true, parking: false, ac: true }, images: [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400', isMain: true }], owner: 'demo-owner', isApproved: true, isActive: true, status: 'approved', createdAt: '2024-01-18T09:15:00Z' },
    { id: 'pg-3', name: 'Student Hub', description: 'Budget-friendly accommodation for students', location: { address: '789 College Street', city: 'Delhi', state: 'Delhi', pincode: '110001' }, roomTypes: [{ type: 'triple', price: 8000, deposit: 4000, totalRooms: 15, availableRooms: 12 }], amenities: { wifi: true, food: false, parking: true }, images: [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400', isMain: true }], owner: 'demo-owner', isApproved: false, isActive: false, status: 'pending', createdAt: '2024-01-19T16:45:00Z' }
];
let mockBookings = [
    { id: 'booking-1', userId: 'demo-user', pgId: 'pg-2', roomType: 'double', startDate: '2024-02-01', endDate: '2024-08-01', monthlyRent: 15000, deposit: 7500, status: 'active', createdAt: '2024-01-25T10:00:00Z' }
];
const mockAmenities = [
    { _id: '1', name: 'WiFi', description: 'High-speed internet connectivity', monthlyCharge: 0, icon: '📶', category: 'basic', isActive: true },
    { _id: '2', name: 'Food/Meals', description: 'Home-cooked meals included', monthlyCharge: 3000, icon: '🍽️', category: 'basic', isActive: true },
];

// --- Middleware Setup ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Rate Limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);


// --- Helper Functions ---
const saveUsers = () => console.log(`Saved ${users.length} users to memory`);

const initializeDemoAccounts = async () => {
  if (users.find(u => u.email === process.env.ADMIN_EMAIL)) {
    console.log('Demo accounts already exist.');
    return;
  }
  const demoAccounts = [
    { name: 'Admin User', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' },
    { name: 'PG Owner', email: 'owner@gharapp.com', password: 'owner123', role: 'owner' },
    { name: 'Demo User', email: 'user@demo.com', password: 'demo123', role: 'user' }
  ];
  for (const account of demoAccounts) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(account.password, salt);
    users.push({ id: `demo-${account.role}`, name: account.name, email: account.email, password: hashedPassword, phone: '', role: account.role, createdAt: new Date().toISOString(), isActive: true });
  }
  saveUsers();
  console.log('Demo accounts initialized.');
};

// --- Auth Middleware ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = { userId: user.id, role: user.role, email: user.email, name: user.name };
    next();
  });
};

const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// --- API Routes ---

// Public Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/amenities', (req, res) => res.json(mockAmenities.filter(a => a.isActive)));

// Auth Routes
const authRouter = express.Router();
authRouter.post('/register', async (req, res) => {
    const { name, email, password, phone, role = 'user' } = req.body;
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = { id: Date.now().toString(), name, email, password: hashedPassword, phone, role, createdAt: new Date().toISOString(), isActive: true };
    users.push(user);
    saveUsers();
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
});

authRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(user => user.email === email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
});
app.use('/api/auth', authRouter);


// PG Routes
const pgRouter = express.Router();
pgRouter.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners or admins can create PGs' });
  }
  const newPG = { id: `pg-${Date.now()}`, ...req.body, owner: req.user.userId, status: 'pending', isApproved: false, isActive: false, createdAt: new Date().toISOString() };
  mockPGs.push(newPG);
  res.status(201).json({ message: 'PG created successfully and is pending approval', pg: newPG });
});
app.use('/api/pgs', pgRouter);


// Admin Routes
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminAuth);

adminRouter.get('/dashboard', (req, res) => {
  res.json({ totalPGs: mockPGs.length, pendingApprovals: mockPGs.filter(p => p.status === 'pending').length, totalUsers: users.length, revenue: mockBookings.reduce((acc, b) => acc + b.monthlyRent, 0) });
});

adminRouter.get('/pgs', (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  let filteredPGs = status ? mockPGs.filter(pg => pg.status === status) : mockPGs;
  res.json({ pgs: filteredPGs, total: filteredPGs.length, page: parseInt(page), limit: parseInt(limit) });
});

adminRouter.put('/pgs/:id/approve', (req, res) => {
  const pg = mockPGs.find(p => p.id === req.params.id);
  if (pg) {
    pg.status = 'approved';
    pg.isApproved = true;
    pg.isActive = true;
    res.json({ success: true, message: 'PG approved' });
  } else {
    res.status(404).json({ message: 'PG not found' });
  }
});

adminRouter.put('/pgs/:id/reject', (req, res) => {
    const pg = mockPGs.find(p => p.id === req.params.id);
    if (pg) {
        pg.status = 'rejected';
        pg.isApproved = false;
        pg.isActive = false;
        res.json({ success: true, message: 'PG rejected' });
    } else {
        res.status(404).json({ message: 'PG not found' });
    }
});

adminRouter.get('/users', (req, res) => {
    const { page = 1, limit = 10, role } = req.query;
    let filteredUsers = role ? users.filter(user => user.role === role) : users;
    res.json({ users: filteredUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt })), total: filteredUsers.length });
});

adminRouter.put('/users/:id/toggle-status', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) {
        user.isActive = !user.isActive;
        res.json({ success: true, message: `User status toggled to ${user.isActive}` });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

adminRouter.get('/bookings', (req, res) => {
    res.json({ bookings: mockBookings, total: mockBookings.length });
});

adminRouter.get('/system/alerts', (req, res) => {
    res.json({ alerts: [{ id: 'alert-1', type: 'warning', message: 'Server load is high', timestamp: new Date().toISOString(), resolved: false }] });
});

adminRouter.get('/analytics/users', (req, res) => {
    res.json({ totalUsers: users.length, byRole: { admin: users.filter(u=>u.role==='admin').length, owner: users.filter(u=>u.role==='owner').length, user: users.filter(u=>u.role==='user').length } });
});

adminRouter.get('/analytics/revenue', (req, res) => {
    res.json({ totalRevenue: 125000, monthlyData: [{ month: 'Jan', revenue: 35000 }, { month: 'Feb', revenue: 45000 }] });
});

adminRouter.get('/analytics/bookings', (req, res) => {
    res.json({ totalBookings: mockBookings.length, active: mockBookings.filter(b => b.status === 'active').length });
});

app.use('/api/admin', adminRouter);


// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


// --- Server Initialization ---
(async () => {
  await initializeDemoAccounts();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
})();
