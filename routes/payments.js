const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.userId.toString() !== req.user.userId) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId,
        userId: req.user.userId
      }
    };

    const order = await razorpay.orders.create(options);
    
    // Save payment record
    const payment = new Payment({
      bookingId,
      userId: req.user.userId,
      orderId: order.id,
      amount,
      status: 'created'
    });
    await payment.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Payment order creation failed' });
  }
});

// Verify payment
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment verified successfully
      const payment = await Payment.findOne({ orderId: razorpay_order_id });
      if (payment) {
        payment.paymentId = razorpay_payment_id;
        payment.signature = razorpay_signature;
        payment.status = 'completed';
        payment.paidAt = new Date();
        await payment.save();

        // Update booking status
        await Booking.findByIdAndUpdate(payment.bookingId, {
          status: 'confirmed',
          paymentStatus: 'paid'
        });

        res.json({ message: 'Payment verified successfully', paymentId: razorpay_payment_id });
      } else {
        res.status(404).json({ message: 'Payment record not found' });
      }
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Refund payment
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paise
      notes: { reason }
    });

    payment.refundId = refund.id;
    payment.refundAmount = amount;
    payment.refundReason = reason;
    payment.status = 'refunded';
    await payment.save();

    res.json({ message: 'Refund processed successfully', refundId: refund.id });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Refund processing failed' });
  }
});

module.exports = router;