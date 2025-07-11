"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const PG_1 = require("../models/PG");
const Booking_1 = require("../models/Booking");
const Review_1 = require("../models/Review");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/dashboard', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const totalUsers = await User_1.User.countDocuments({ role: 'user' });
        const totalOwners = await User_1.User.countDocuments({ role: 'owner' });
        const totalPGs = await PG_1.PG.countDocuments();
        const approvedPGs = await PG_1.PG.countDocuments({ isApproved: true });
        const pendingPGs = await PG_1.PG.countDocuments({ isApproved: false });
        const totalBookings = await Booking_1.Booking.countDocuments();
        const totalReviews = await Review_1.Review.countDocuments();
        const recentBookings = await Booking_1.Booking.find()
            .populate('userId', 'name email')
            .populate('pgId', 'name location')
            .sort('-createdAt')
            .limit(10);
        const revenueStats = await Booking_1.Booking.aggregate([
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
        const monthlyStats = await Booking_1.Booking.aggregate([
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/pgs', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
        if (status === 'pending') {
            filter.isApproved = false;
        }
        else if (status === 'approved') {
            filter.isApproved = true;
        }
        const pgs = await PG_1.PG.find(filter)
            .populate('ownerId', 'name email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(limitNum);
        const total = await PG_1.PG.countDocuments(filter);
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
    }
    catch (error) {
        next(error);
    }
});
router.put('/pgs/:id/approve', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const pg = await PG_1.PG.findById(req.params.id);
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found', 404);
        }
        pg.isApproved = true;
        await pg.save();
        res.json({
            status: 'success',
            message: 'PG approved successfully',
            data: { pg },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/pgs/:id/reject', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { reason } = req.body;
        const pg = await PG_1.PG.findById(req.params.id);
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found', 404);
        }
        pg.isApproved = false;
        pg.isActive = false;
        await pg.save();
        res.json({
            status: 'success',
            message: 'PG rejected successfully',
            data: { pg },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 10, role } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
        if (role && role !== 'all') {
            filter.role = role;
        }
        const users = await User_1.User.find(filter)
            .sort('-createdAt')
            .skip(skip)
            .limit(limitNum);
        const total = await User_1.User.countDocuments(filter);
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
    }
    catch (error) {
        next(error);
    }
});
router.put('/users/:id/toggle-status', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        if (user._id.toString() === req.user._id.toString()) {
            throw (0, errorHandler_1.createError)('Cannot modify your own account status', 400);
        }
        user.isVerified = !user.isVerified;
        await user.save();
        res.json({
            status: 'success',
            message: `User ${user.isVerified ? 'activated' : 'deactivated'} successfully`,
            data: { user },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/bookings', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
        if (status) {
            filter.bookingStatus = status;
        }
        const bookings = await Booking_1.Booking.find(filter)
            .populate('userId', 'name email phone')
            .populate('pgId', 'name location')
            .sort('-createdAt')
            .skip(skip)
            .limit(limitNum);
        const total = await Booking_1.Booking.countDocuments(filter);
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map