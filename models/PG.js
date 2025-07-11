const mongoose = require('mongoose');

const pgSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'PG name is required'],
    trim: true,
    maxlength: [100, 'PG name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      index: true
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  images: [{
    url: String,
    publicId: String,
    isMain: { type: Boolean, default: false }
  }],
  roomTypes: [{
    type: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory'],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: [1000, 'Price must be at least ₹1000']
    },
    deposit: {
      type: Number,
      required: true,
      min: [0, 'Deposit cannot be negative']
    },
    totalRooms: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 room']
    },
    availableRooms: {
      type: Number,
      required: true,
      min: [0, 'Available rooms cannot be negative']
    },
    amenities: [String],
    size: Number // in sq ft
  }],
  amenities: {
    wifi: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    laundry: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    powerBackup: { type: Boolean, default: false }
  },
  extraAmenities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Amenity'
  }],
  rules: [String],
  rating: {
    overall: { type: Number, default: 0, min: 0, max: 5 },
    cleanliness: { type: Number, default: 0, min: 0, max: 5 },
    safety: { type: Number, default: 0, min: 0, max: 5 },
    location: { type: Number, default: 0, min: 0, max: 5 },
    valueForMoney: { type: Number, default: 0, min: 0, max: 5 },
    staff: { type: Number, default: 0, min: 0, max: 5 }
  },
  reviewCount: { type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  pricing: {
    basePrice: Number,
    weekendSurcharge: { type: Number, default: 0 },
    seasonalMultiplier: { type: Number, default: 1 },
    discounts: [{
      type: String, // 'early_bird', 'long_stay', 'student'
      percentage: Number,
      conditions: String
    }]
  },
  availability: [{
    date: Date,
    roomType: String,
    availableCount: Number
  }],
  policies: {
    checkIn: { type: String, default: '12:00 PM' },
    checkOut: { type: String, default: '11:00 AM' },
    cancellation: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate'
    },
    guestPolicy: String,
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
pgSchema.index({ 'location.city': 1, isApproved: 1, isActive: 1 });
pgSchema.index({ 'roomTypes.price': 1 });
pgSchema.index({ rating: -1 });
pgSchema.index({ createdAt: -1 });
pgSchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for average price
pgSchema.virtual('averagePrice').get(function() {
  if (this.roomTypes.length === 0) return 0;
  const total = this.roomTypes.reduce((sum, room) => sum + room.price, 0);
  return Math.round(total / this.roomTypes.length);
});

// Update availability when booking is made
pgSchema.methods.updateAvailability = function(roomType, date, count = 1) {
  const room = this.roomTypes.find(r => r.type === roomType);
  if (room && room.availableRooms >= count) {
    room.availableRooms -= count;
    return this.save();
  }
  throw new Error('Room not available');
};

module.exports = mongoose.model('PG', pgSchema);