import express, { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// @route   POST /api/payments/create-payment-intent
// @desc    Create payment intent for booking
// @access  Private
router.post('/create-payment-intent', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      throw createError('Booking ID is required', 400);
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
    }).populate('pgId', 'name');

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.paymentStatus === 'paid') {
      throw createError('Booking is already paid', 400);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalAmount * 100), // Amount in cents
      currency: 'inr',
      metadata: {
        bookingId: (booking._id as mongoose.Types.ObjectId).toString(),
        userId: (req.user._id as string).toString(),
        pgName: (booking.pgId as any).name,
      },
      description: `Booking payment for ${(booking.pgId as any).name}`,
    });

    // Store payment intent ID in booking
    booking.paymentId = paymentIntent.id;
    await booking.save();

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments/confirm-payment
// @desc    Confirm payment and update booking status
// @access  Private
router.post('/confirm-payment', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      throw createError('Payment Intent ID is required', 400);
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw createError('Payment not completed', 400);
    }

    // Find and update booking
    const booking = await Booking.findOne({
      paymentId: paymentIntentId,
      userId: req.user._id,
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    booking.paymentStatus = 'paid';
    booking.bookingStatus = 'confirmed';
    await booking.save();

    res.json({
      status: 'success',
      message: 'Payment confirmed successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhooks
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status
        const booking = await Booking.findOne({
          paymentId: paymentIntent.id,
        });

        if (booking) {
          booking.paymentStatus = 'paid';
          booking.bookingStatus = 'confirmed';
          await booking.save();
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status
        const failedBooking = await Booking.findOne({
          paymentId: failedPayment.id,
        });

        if (failedBooking) {
          failedBooking.paymentStatus = 'failed';
          await failedBooking.save();
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund for cancelled booking
// @access  Private (Admin only)
router.post('/refund', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'admin') {
      throw createError('Access denied. Admin role required.', 403);
    }

    const { bookingId, amount, reason } = req.body;

    if (!bookingId) {
      throw createError('Booking ID is required', 400);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.paymentStatus !== 'paid') {
      throw createError('Cannot refund unpaid booking', 400);
    }

    if (!booking.paymentId) {
      throw createError('No payment ID found for this booking', 400);
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: 'requested_by_customer',
      metadata: {
        bookingId: (booking._id as mongoose.Types.ObjectId).toString(),
        reason: reason || 'Booking cancellation',
      },
    });

    // Update booking status
    booking.paymentStatus = 'refunded';
    await booking.save();

    res.json({
      status: 'success',
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount / 100,
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
