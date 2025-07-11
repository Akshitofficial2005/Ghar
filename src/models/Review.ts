import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isVerified: boolean;
  adminResponse?: string;
  adminResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pgId: {
    type: Schema.Types.ObjectId,
    ref: 'PG',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    minlength: [10, 'Comment must be at least 10 characters long'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  adminResponse: {
    type: String,
    maxlength: [500, 'Admin response cannot exceed 500 characters'],
    trim: true,
  },
  adminResponseAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one review per user per PG
reviewSchema.index({ userId: 1, pgId: 1 }, { unique: true });
reviewSchema.index({ pgId: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
