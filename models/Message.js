const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'booking_inquiry'],
    default: 'text'
  },
  attachments: [{
    url: String,
    type: String, // 'image', 'document', 'audio'
    filename: String,
    size: Number
  }],
  metadata: {
    pgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PG'
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ createdAt: -1 });

// Static method to create conversation ID
messageSchema.statics.createConversationId = function(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Static method to get conversation
messageSchema.statics.getConversation = async function(userId1, userId2, page = 1, limit = 50) {
  const conversationId = this.createConversationId(userId1, userId2);
  const skip = (page - 1) * limit;
  
  return this.find({
    conversationId,
    isDeleted: false
  })
  .populate('sender', 'name avatar')
  .populate('receiver', 'name avatar')
  .populate('replyTo', 'message sender')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  if (this.receiver.toString() === userId.toString() && !this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Message', messageSchema);