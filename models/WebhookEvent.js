const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  receivedAt: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
  processedAt: Date,
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
