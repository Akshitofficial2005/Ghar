const express = require('express');
const User = require('../models/User');
const PG = require('../models/PG');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const router = express.Router();

// Admin middleware
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get dashboard stats
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPGs = await PG.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingApprovals = await PG.countDocuments({ isApproved: false });

    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('pg', 'name location')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        totalPGs,
        totalBookings,
        pendingApprovals
      },
      recentBookings
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all PGs for admin
router.get('/pgs', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = {};
    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pgs = await PG.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PG.countDocuments(query);

    res.json({
      pgs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Get admin PGs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve PG
router.put('/pgs/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const pg = await PG.findByIdAndUpdate(
      req.params.id,
      { 
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        approvedBy: req.user.userId
      },
      { new: true }
    ).populate('owner', 'name email phone');

    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    // Send notification to owner
    if (pg.owner) {
      try {
        await notificationService.sendPGApprovalNotification(
          pg.owner,
          pg.name,
          'approved'
        );
        console.log(`Approval notification sent to ${pg.owner.email}`);
      } catch (notificationError) {
        console.error('Failed to send approval notification:', notificationError);
      }
    }

    // Broadcast real-time update
    global.io?.emit('pgStatusUpdate', {
      pgId: pg._id,
      status: 'approved',
      isActive: true
    });

    res.json({
      message: 'PG approved successfully',
      pg
    });
  } catch (error) {
    console.error('Approve PG error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject PG
router.put('/pgs/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;

    const pg = await PG.findByIdAndUpdate(
      req.params.id,
      { 
        isApproved: false,
        isActive: false,
        rejectionReason: reason
      },
      { new: true }
    ).populate('owner', 'name email phone');

    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    // Send notification to owner
    if (pg.owner) {
      try {
        await notificationService.sendPGApprovalNotification(
          pg.owner,
          pg.name,
          'rejected'
        );
        console.log(`Rejection notification sent to ${pg.owner.email}`);
      } catch (notificationError) {
        console.error('Failed to send rejection notification:', notificationError);
      }
    }

    res.json({
      message: 'PG rejected successfully',
      pg
    });
  } catch (error) {
    console.error('Reject PG error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users for admin
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    
    let query = {};
    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('name email role isActive createdAt phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        phone: user.phone
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle user status
router.put('/users/:id/toggle-status', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    console.log(`Toggled user ${req.params.id} status to: ${user.isActive ? 'active' : 'inactive'}`);
    
    res.json({ 
      success: true, 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;