const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  pgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PG',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, required: true, min: 1, max: 5 },
    safety: { type: Number, required: true, min: 1, max: 5 },
    location: { type: Number, required: true, min: 1, max: 5 },
    valueForMoney: { type: Number, required: true, min: 1, max: 5 },
    staff: { type: Number, required: true, min: 1, max: 5 }
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  pros: [String],
  cons: [String],
  images: [String],
  isVerified: {
    type: Boolean,
    default: false
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  moderationNotes: String,
  helpfulVotes: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  },
  ownerResponse: {
    message: String,
    respondedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one review per booking
reviewSchema.index({ bookingId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);