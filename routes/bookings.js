const express = require('express');
const Booking = require('../models/Booking');
const PG = require('../models/PG');
const auth = require('../middleware/auth');
const router = express.Router();

// Create booking
router.post('/', auth, async (req, res) => {
  try {
    const { pgId, roomTypeId, checkIn, checkOut, guests } = req.body;

    // Check if PG exists
    const pg = await PG.findById(pgId);
    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    // Find room type and calculate price
    const roomType = pg.roomTypes.id(roomTypeId);
    if (!roomType) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    // Calculate total amount
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = roomType.price * nights;

    const booking = new Booking({
      userId: req.user.userId,
      pgId,
      roomTypeId,
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
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId })
      .populate('pgId', 'name location images')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single booking
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('pgId', 'name location images owner')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status
router.put('/:id/status', auth, async (req, res) => {
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