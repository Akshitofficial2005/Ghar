import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Booking, IBooking } from '../models/Booking';
import { PG } from '../models/PG';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('pgId').notEmpty().withMessage('PG ID is required'),
    body('roomTypeId').notEmpty().withMessage('Room type ID is required'),
    body('checkIn')
      .isISO8601()
      .withMessage('Check-in date must be a valid date'),
    body('checkOut')
      .isISO8601()
      .withMessage('Check-out date must be a valid date'),
    body('guests')
      .isInt({ min: 1, max: 10 })
      .withMessage('Number of guests must be between 1 and 10'),
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { pgId, roomTypeId, checkIn, checkOut, guests, specialRequests } = req.body;

      // Validate dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        throw createError('Check-in date cannot be in the past', 400);
      }

      if (checkOutDate <= checkInDate) {
        throw createError('Check-out date must be after check-in date', 400);
      }

      // Check if PG exists and is approved
      const pg = await PG.findOne({
        _id: pgId,
        isApproved: true,
        isActive: true,
      });

      if (!pg) {
        throw createError('PG not found or not available for booking', 404);
      }

      // Find the room type
      const roomType = pg.roomTypes.find(rt => rt._id?.toString() === roomTypeId);
      if (!roomType) {
        throw createError('Room type not found', 404);
      }

      // Check room availability
      if (roomType.availableRooms < 1) {
        throw createError('No rooms available for this type', 400);
      }

      // Calculate total amount (for simplicity, using daily rate)
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = roomType.price * nights;

      // Check for overlapping bookings
      const overlappingBookings = await Booking.find({
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
        throw createError('No rooms available for the selected dates', 400);
      }

      const booking = new Booking({
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
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId: req.user._id };
    if (status) {
      filter.bookingStatus = status;
    }

    const bookings = await Booking.find(filter)
      .populate('pgId', 'name images location')
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

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('pgId', 'name images location ownerName ownerPhone');

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    res.json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private
router.put(
  '/:id/cancel',
  authenticate,
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters'),
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const booking = await Booking.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });

      if (!booking) {
        throw createError('Booking not found', 404);
      }

      if (booking.bookingStatus === 'cancelled') {
        throw createError('Booking is already cancelled', 400);
      }

      if (booking.bookingStatus === 'completed') {
        throw createError('Cannot cancel a completed booking', 400);
      }

      // Check if cancellation is allowed (e.g., at least 24 hours before check-in)
      const now = new Date();
      const checkInDate = new Date(booking.checkIn);
      const hoursDifference = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDifference < 24) {
        throw createError('Cancellation not allowed within 24 hours of check-in', 400);
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
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/bookings/owner/dashboard
// @desc    Get bookings for PG owner's dashboard
// @access  Private (Owner only)
router.get('/owner/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'owner') {
      throw createError('Access denied. Owner role required.', 403);
    }

    // Get all PGs owned by this user
    const ownerPGs = await PG.find({ ownerId: req.user._id }).select('_id');
    const pgIds = ownerPGs.map(pg => pg._id);

    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { pgId: { $in: pgIds } };
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

    // Get booking statistics
    const stats = await Booking.aggregate([
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
  } catch (error) {
    next(error);
  }
});

export default router;
