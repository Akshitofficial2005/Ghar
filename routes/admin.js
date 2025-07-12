const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PG = require('../models/PG');
const Booking = require('../models/Booking');
const { authMiddleware, adminAuth } = require('../middleware/auth');

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminAuth);

// --- DASHBOARD ---
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalPGs = await PG.countDocuments();
        const pendingApprovals = await PG.countDocuments({ status: 'pending' });
        
        const revenueResult = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.json({
            totalUsers,
            totalPGs,
            pendingApprovals,
            revenue: totalRevenue,
        });
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard stats.' });
    }
});

// --- PG MANAGEMENT ---
router.get('/pgs', async (req, res) => {
    try {
        const pgs = await PG.find().populate('owner', 'name email');
        res.json({ pgs, total: pgs.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/pgs/:id/approve', async (req, res) => {
    try {
        const pg = await PG.findByIdAndUpdate(req.params.id, { status: 'approved', isApproved: true }, { new: true });
        if (!pg) return res.status(404).json({ message: 'PG not found' });
        res.json(pg);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/pgs/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;
        const pg = await PG.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason }, { new: true });
        if (!pg) return res.status(404).json({ message: 'PG not found' });
        res.json(pg);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// --- USER MANAGEMENT ---
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ users, total: users.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/users/:id/toggle-status', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ message: 'User status toggled successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// --- BOOKINGS MANAGEMENT ---
router.get('/bookings', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const total = await Booking.countDocuments();
        const bookings = await Booking.find()
            .populate('user', 'name email')
            .populate('pg', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(startIndex);

        res.json({
            bookings,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- FLATTENED ANALYTICS & SYSTEM ROUTES ---

// System Alerts
router.get('/system-alerts', async (req, res) => {
    res.json({ alerts: [{ id: 'alert-1', type: 'warning', message: 'High server load detected', timestamp: new Date().toISOString() }] });
});

// User Analytics
router.get('/analytics-users', async (req, res) => {
    try {
        const total = await User.countDocuments();
        const byRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        
        // Transform to Chart.js format
        const labels = byRole.map(item => item._id || 'Unknown');
        const data = byRole.map(item => item.count);
        
        const chartData = {
            labels,
            datasets: [{
                label: 'Users by Role',
                data,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        res.json(chartData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Booking Analytics
router.get('/analytics-bookings', async (req, res) => {
    try {
        const total = await Booking.countDocuments();
        const byStatus = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        // Transform to Chart.js format for Doughnut chart
        const labels = byStatus.length > 0 ? byStatus.map(item => item._id || 'Unknown') : ['No Data'];
        const data = byStatus.length > 0 ? byStatus.map(item => item.count) : [1];
        
        const chartData = {
            labels,
            datasets: [{
                label: 'Bookings by Status',
                data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        res.json(chartData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Revenue Analytics
router.get('/analytics-revenue', async (req, res) => {
    try {
        const totalResult = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const total = totalResult.length > 0 ? totalResult[0].total : 0;
        
        // Create monthly data for the last 6 months
        const monthlyData = [];
        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            // For now, distribute total revenue across months (in real app, you'd query by month)
            monthlyData.push(i === 0 ? total : Math.floor(total / 6));
        }
        
        // Transform to Chart.js format for Line chart
        const chartData = {
            labels: monthlyData.map((_, index) => {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5 + index, 1);
                return date.toLocaleString('default', { month: 'short' });
            }),
            datasets: [{
                label: 'Revenue (₹)',
                data: monthlyData,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };
        
        res.json(chartData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;