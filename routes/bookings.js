const express = require('express');
const Booking = require('../models/Booking');
const PG = require('../models/PG');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pgId, roomTypeId, checkIn, checkOut, guests } = req.body;
    const userId = req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authenticated user not found' });
    }

    // Check if PG exists
    const pg = await PG.findById(pgId);
    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    // Find room type and calculate price with fallback for PGs that don't define roomTypes
    const roomTypes = Array.isArray(pg.roomTypes) ? pg.roomTypes : [];
    let roomType = null;

    if (roomTypes.length > 0 && roomTypeId) {
      roomType = typeof roomTypes.id === 'function'
        ? roomTypes.id(roomTypeId)
        : roomTypes.find(rt => rt._id?.toString() === roomTypeId);
    }

    if (!roomType && roomTypes.length > 0) {
      roomType = roomTypes[0];
    }

    const resolvedNightlyPrice = roomType?.price
      || pg?.price?.monthly
      || pg?.pricePerMonth
      || pg?.pricing?.basePrice;

    if (!resolvedNightlyPrice || Number(resolvedNightlyPrice) <= 0) {
      return res.status(400).json({ message: 'Unable to determine booking price for PG' });
    }

    // Calculate total amount
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = Number(resolvedNightlyPrice) * nights;

    const booking = new Booking({
      userId,
      pgId,
      roomTypeId: roomType?._id || roomTypeId || null,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
      status: 'pending'
    });

    await booking.save();
    await booking.populate('pgId', 'name location images');
    await booking.populate('userId', 'name email phone');

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    const bookings = await Booking.find({ userId })
      .populate('pgId', 'name location images')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single booking
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('pgId', 'name location images owner')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const userId = req.user?._id || req.user?.userId;
    if (booking.userId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();

    res.json({ message: 'Booking status updated', booking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;