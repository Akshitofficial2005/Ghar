import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PG } from '../models/PG';
import { Booking } from '../models/Booking';
import { Review } from '../models/Review';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalPGs = await PG.countDocuments();
    const approvedPGs = await PG.countDocuments({ isApproved: true });
    const pendingPGs = await PG.countDocuments({ isApproved: false });
    const totalBookings = await Booking.countDocuments();
    const totalReviews = await Review.countDocuments();

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('pgId', 'name location')
      .sort('-createdAt')
      .limit(10);

    // Get revenue statistics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageBookingValue: { $avg: '$totalAmount' },
        },
      },
    ]);

    // Get monthly booking trends
    const monthlyStats = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    res.json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalOwners,
          totalPGs,
          approvedPGs,
          pendingPGs,
          totalBookings,
          totalReviews,
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          averageBookingValue: revenueStats[0]?.averageBookingValue || 0,
        },
        recentBookings,
        monthlyStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/pgs
// @desc    Get all PGs for admin approval
// @access  Private (Admin only)
router.get('/pgs', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status === 'pending') {
      filter.isApproved = false;
    } else if (status === 'approved') {
      filter.isApproved = true;
    }

    const pgs = await PG.find(filter)
      .populate('ownerId', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await PG.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        pgs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/pgs/:id/approve
// @desc    Approve a PG
// @access  Private (Admin only)
router.put('/pgs/:id/approve', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pg = await PG.findById(req.params.id);
    if (!pg) {
      throw createError('PG not found', 404);
    }

    pg.isApproved = true;
    await pg.save();

    res.json({
      status: 'success',
      message: 'PG approved successfully',
      data: { pg },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/pgs/:id/reject
// @desc    Reject a PG
// @access  Private (Admin only)
router.put('/pgs/:id/reject', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    
    const pg = await PG.findById(req.params.id);
    if (!pg) {
      throw createError('PG not found', 404);
    }

    pg.isApproved = false;
    pg.isActive = false;
    await pg.save();

    // TODO: Send notification to owner with rejection reason

    res.json({
      status: 'success',
      message: 'PG rejected successfully',
      data: { pg },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (role && role !== 'all') {
      filter.role = role;
    }

    const users = await User.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/users/:id/toggle-status', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Prevent admin from deactivating themselves
    if ((user._id as mongoose.Types.ObjectId).toString() === (req.user._id as string).toString()) {
      throw createError('Cannot modify your own account status', 400);
    }

    // Toggle isVerified status (using this as active/inactive)
    user.isVerified = !user.isVerified;
    await user.save();

    res.json({
      status: 'success',
      message: `User ${user.isVerified ? 'activated' : 'deactivated'} successfully`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings
// @access  Private (Admin only)
router.get('/bookings', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status) {
      filter.bookingStatus = status;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email phone')
      .populate('pgId', 'name location')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
