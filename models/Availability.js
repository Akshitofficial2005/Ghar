const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  pgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PG',
    required: true
  },
  roomType: {
    type: String,
    required: true,
    enum: ['single', 'double', 'triple', 'dormitory']
  },
  date: {
    type: Date,
    required: true
  },
  totalRooms: {
    type: Number,
    required: true,
    min: 0
  },
  bookedRooms: {
    type: Number,
    default: 0,
    min: 0
  },
  blockedRooms: {
    type: Number,
    default: 0,
    min: 0
  },
  maintenanceRooms: {
    type: Number,
    default: 0,
    min: 0
  },
  price: {
    type: Number,
    required: true
  },
  dynamicPricing: {
    basePrice: Number,
    demandMultiplier: { type: Number, default: 1 },
    seasonalMultiplier: { type: Number, default: 1 },
    weekendSurcharge: { type: Number, default: 0 }
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
availabilitySchema.index({ pgId: 1, roomType: 1, date: 1 }, { unique: true });
availabilitySchema.index({ date: 1, pgId: 1 });

// Virtual for available rooms
availabilitySchema.virtual('availableRooms').get(function() {
  return Math.max(0, this.totalRooms - this.bookedRooms - this.blockedRooms - this.maintenanceRooms);
});

// Method to check availability
availabilitySchema.methods.isAvailable = function(requestedRooms = 1) {
  return !this.isBlocked && this.availableRooms >= requestedRooms;
};

// Method to book rooms
availabilitySchema.methods.bookRooms = function(count = 1) {
  if (!this.isAvailable(count)) {
    throw new Error('Insufficient rooms available');
  }
  this.bookedRooms += count;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to release rooms (for cancellations)
availabilitySchema.methods.releaseRooms = function(count = 1) {
  this.bookedRooms = Math.max(0, this.bookedRooms - count);
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to get availability for date range
availabilitySchema.statics.getAvailabilityRange = async function(pgId, roomType, startDate, endDate) {
  return this.find({
    pgId,
    roomType,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

// Static method to create availability for multiple dates
availabilitySchema.statics.createBulkAvailability = async function(pgId, roomType, dates, totalRooms, basePrice) {
  const availabilityDocs = dates.map(date => ({
    pgId,
    roomType,
    date,
    totalRooms,
    price: basePrice
  }));
  
  return this.insertMany(availabilityDocs, { ordered: false });
};

module.exports = mongoose.model('Availability', availabilitySchema);