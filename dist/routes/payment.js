"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const Booking_1 = require("../models/Booking");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
router.post('/create-payment-intent', auth_1.authenticate, async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            throw (0, errorHandler_1.createError)('Booking ID is required', 400);
        }
        const booking = await Booking_1.Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
        }).populate('pgId', 'name');
        if (!booking) {
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        if (booking.paymentStatus === 'paid') {
            throw (0, errorHandler_1.createError)('Booking is already paid', 400);
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(booking.totalAmount * 100),
            currency: 'inr',
            metadata: {
                bookingId: booking._id.toString(),
                userId: req.user._id.toString(),
                pgName: booking.pgId.name,
            },
            description: `Booking payment for ${booking.pgId.name}`,
        });
        booking.paymentId = paymentIntent.id;
        await booking.save();
        res.json({
            status: 'success',
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/confirm-payment', auth_1.authenticate, async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
            throw (0, errorHandler_1.createError)('Payment Intent ID is required', 400);
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw (0, errorHandler_1.createError)('Payment not completed', 400);
        }
        const booking = await Booking_1.Booking.findOne({
            paymentId: paymentIntentId,
            userId: req.user._id,
        });
        if (!booking) {
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        booking.paymentStatus = 'paid';
        booking.bookingStatus = 'confirmed';
        await booking.save();
        res.json({
            status: 'success',
            message: 'Payment confirmed successfully',
            data: { booking },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        }
        catch (err) {
            console.log(`Webhook signature verification failed.`, err);
            return res.status(400).send(`Webhook Error: ${err}`);
        }
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const booking = await Booking_1.Booking.findOne({
                    paymentId: paymentIntent.id,
                });
                if (booking) {
                    booking.paymentStatus = 'paid';
                    booking.bookingStatus = 'confirmed';
                    await booking.save();
                }
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                const failedBooking = await Booking_1.Booking.findOne({
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/refund', auth_1.authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            throw (0, errorHandler_1.createError)('Access denied. Admin role required.', 403);
        }
        const { bookingId, amount, reason } = req.body;
        if (!bookingId) {
            throw (0, errorHandler_1.createError)('Booking ID is required', 400);
        }
        const booking = await Booking_1.Booking.findById(bookingId);
        if (!booking) {
            throw (0, errorHandler_1.createError)('Booking not found', 404);
        }
        if (booking.paymentStatus !== 'paid') {
            throw (0, errorHandler_1.createError)('Cannot refund unpaid booking', 400);
        }
        if (!booking.paymentId) {
            throw (0, errorHandler_1.createError)('No payment ID found for this booking', 400);
        }
        const refund = await stripe.refunds.create({
            payment_intent: booking.paymentId,
            amount: amount ? Math.round(amount * 100) : undefined,
            reason: 'requested_by_customer',
            metadata: {
                bookingId: booking._id.toString(),
                reason: reason || 'Booking cancellation',
            },
        });
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map