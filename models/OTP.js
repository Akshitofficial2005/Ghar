const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('OTP', otpSchema);