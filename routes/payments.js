const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const WebhookEvent = require('../models/WebhookEvent');
const router = express.Router();

const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = razorpayConfigured
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

if (!razorpayConfigured) {
  logger.warn('Razorpay keys not set; payments endpoints will return 503');
}

// Create payment order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;

    if (!razorpayConfigured || !razorpay) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    const { bookingId, amount } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking || !userId || booking.userId.toString() !== userId.toString()) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId,
        userId: userId.toString()
      }
    };

    const order = await razorpay.orders.create(options);
    
    // Save payment record
    const payment = new Payment({
      bookingId,
      userId,
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
    const authFailed = error?.statusCode === 401
      && /authentication failed/i.test(error?.error?.description || '');

    if (authFailed) {
      logger.warn('Razorpay authentication failed during order creation; treating as gateway unavailable');
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

    logger.error('Create order error: %o', error);
    res.status(500).json({ message: 'Payment order creation failed' });
  }
});

// Verify payment
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    if (!razorpayConfigured || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

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
    logger.error('Payment verification error: %o', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Refund payment
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    if (!razorpayConfigured || !razorpay) {
      return res.status(503).json({ message: 'Payment gateway is not configured' });
    }

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
    logger.error('Refund error: %o', error);
    res.status(500).json({ message: 'Refund processing failed' });
  }
});

// Razorpay webhook endpoint (does not require auth)
// Use raw body parser to verify signature
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured; rejecting webhook');
      return res.status(503).send('Webhook not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).send('Missing signature');

    const payload = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    const rawForHmac = req.body instanceof Buffer ? req.body : Buffer.from(payload);
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawForHmac).digest('hex');

    if (expected !== signature) {
      logger.warn('Invalid webhook signature - received=%s expected=%s payload=%s', signature, expected, String(payload).slice(0,200));
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(payload);

    // Idempotency: compute a key from event id or payload
    const eventKey = event.id || event.payload?.payment?.entity?.id || event.payload?.payment?.entity?.order_id || crypto.createHash('sha256').update(payload).digest('hex');

    // If we've processed this event before, acknowledge and skip
    const seen = await WebhookEvent.findOne({ key: eventKey });
    if (seen) {
      logger.info('Duplicate webhook event ignored: %s', eventKey);
      return res.status(200).send('duplicate');
    }

    // Mark as received to prevent replays during processing
    await WebhookEvent.create({ key: eventKey, meta: { event: event.event } });

    // Handle a few important events
    if (event && event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const amount = paymentEntity.amount / 100;

        // Update payment record if exists
        const paymentRecord = await Payment.findOne({ orderId });
        if (paymentRecord) {
          paymentRecord.paymentId = paymentId;
          paymentRecord.status = 'completed';
          paymentRecord.paidAt = new Date();
          await paymentRecord.save();

          // Update booking status if referenced
          if (paymentRecord.bookingId) {
            await Booking.findByIdAndUpdate(paymentRecord.bookingId, { status: 'confirmed', paymentStatus: 'paid' });
          }
        }
      }
    }

    // mark processed
    await WebhookEvent.findOneAndUpdate({ key: eventKey }, { processed: true, processedAt: new Date() });

    // Respond OK to acknowledge receipt
    res.status(200).send('ok');
  } catch (err) {
    logger.error('Webhook processing error: %o', err);
    res.status(500).send('webhook error');
  }
});

module.exports = router;