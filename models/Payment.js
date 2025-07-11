const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  paymentId: String,
  signature: String,
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'completed', 'failed', 'refunded'],
    default: 'created'
  },
  refundId: String,
  refundAmount: Number,
  refundReason: String,
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);