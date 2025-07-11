"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Booking_1 = require("../models/Booking");
const PG_1 = require("../models/PG");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('pgId').notEmpty().withMessage('PG ID is required'),
    (0, express_validator_1.body)('roomTypeId').notEmpty().withMessage('Room type ID is required'),
    (0, express_validator_1.body)('checkIn')
        .isISO8601()
        .withMessage('Check-in date must be a valid date'),
    (0, express_validator_1.body)('checkOut')
        .isISO8601()
        .withMessage('Check-out date must be a valid date'),
    (0, express_validator_1.body)('guests')
        .isInt({ min: 1, max: 10 })
        .withMessage('Number of guests must be between 1 and 10'),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        const { pgId, roomTypeId, checkIn, checkOut, guests, specialRequests } = req.body;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (checkInDate < today) {
            throw (0, errorHandler_1.createError)('Check-in date cannot be in the past', 400);
        }
        if (checkOutDate <= checkInDate) {
            throw (0, errorHandler_1.createError)('Check-out date must be after check-in date', 400);
        }
        const pg = await PG_1.PG.findOne({
            _id: pgId,
            isApproved: true,
            isActive: true,
        });
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found or not available for booking', 404);
        }
        const roomType = pg.roomTypes.find(rt => rt._id?.toString() === roomTypeId);
        if (!roomType) {
            throw (0, errorHandler_1.createError)('Room type not found', 404);
        }
        if (roomType.availableRooms < 1) {
            throw (0, errorHandler_1.createError)('No rooms available for this type', 400);
        }
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalAmount = roomType.price * nights;
        const overlappingBookings = await Booking_1.Booking.find({
            pgId,
            roomTypeId,
            bookingStatus: { $in: ['pending', 'confirmed'] },
            $or: [
                {
                    checkIn: { $lte: checkOutDate },
                    checkOut: { $gte: checkInDate },
                },
            ],
        });
        if (overlappingBookings.length >= roomType.availableRooms) {
            throw (0, errorHandler_1.createError)('No rooms available for the selected dates', 400);
        }
        const booking = new Booking_1.Booking({
            userId: req.user._id,
            pgId,
            roomTypeId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            totalAmount,
            specialRequests,
        });
        await booking.save();
        res.status(201).json({
            status: 'success',
            message: 'Booking created successfully',
            data: { booking },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const filter = { userId: req.user._id };
        if (status) {
            filter.bookingStatus = status;
        }
        const bookings = await Booking_1.Booking.find(filter)
            .populate('pgId', 'name images location')
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
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const booking = await Booking_1.Booking.findOne({
            _id: req.params.id,
            userId: req.user._id,
        }).populate('pgId', 'name images location ownerName ownerPhone');
        if (!booking) {
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        res.json({
            status: 'success',
            data: { booking },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id/cancel', auth_1.authenticate, [
    (0, express_validator_1.body)('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Cancellation reason cannot exceed 500 characters'),
], async (req, res, next) => {
    try {
        const booking = await Booking_1.Booking.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!booking) {
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        if (booking.bookingStatus === 'cancelled') {
            throw (0, errorHandler_1.createError)('Booking is already cancelled', 400);
        }
        if (booking.bookingStatus === 'completed') {
            throw (0, errorHandler_1.createError)('Cannot cancel a completed booking', 400);
        }
        const now = new Date();
        const checkInDate = new Date(booking.checkIn);
        const hoursDifference = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDifference < 24) {
            throw (0, errorHandler_1.createError)('Cancellation not allowed within 24 hours of check-in', 400);
        }
        booking.bookingStatus = 'cancelled';
        booking.cancellationReason = req.body.reason;
        booking.cancelledAt = new Date();
        await booking.save();
        res.json({
            status: 'success',
            message: 'Booking cancelled successfully',
            data: { booking },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/owner/dashboard', auth_1.authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'owner') {
            throw (0, errorHandler_1.createError)('Access denied. Owner role required.', 403);
        }
        const ownerPGs = await PG_1.PG.find({ ownerId: req.user._id }).select('_id');
        const pgIds = ownerPGs.map(pg => pg._id);
        const { page = 1, limit = 10, status } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const filter = { pgId: { $in: pgIds } };
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
        const stats = await Booking_1.Booking.aggregate([
            { $match: { pgId: { $in: pgIds } } },
            {
                $group: {
                    _id: '$bookingStatus',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                },
            },
        ]);
        res.json({
            status: 'success',
            data: {
                bookings,
                stats,
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
//# sourceMappingURL=booking.js.map