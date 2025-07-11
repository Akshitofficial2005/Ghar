const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  monthlyCharge: {
    type: Number,
    required: true,
    min: 0
  },
  icon: {
    type: String,
    default: '🏠'
  },
  category: {
    type: String,
    enum: ['basic', 'premium', 'luxury'],
    default: 'basic'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Amenity', amenitySchema);