import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomType {
  _id?: mongoose.Types.ObjectId;
  type: 'single' | 'double' | 'triple' | 'dormitory';
  price: number;
  deposit: number;
  availableRooms: number;
  totalRooms: number;
  amenities: string[];
  images: string[];
}

export interface IPG extends Document {
  name: string;
  description: string;
  images: string[];
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  amenities: {
    wifi: boolean;
    food: boolean;
    laundry: boolean;
    parking: boolean;
    gym: boolean;
    ac: boolean;
    powerBackup: boolean;
    security: boolean;
  };
  roomTypes: IRoomType[];
  rules: string[];
  ownerId: mongoose.Types.ObjectId;
  ownerName: string;
  ownerPhone: string;
  rating: number;
  reviewCount: number;
  isApproved: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomTypeSchema = new Schema<IRoomType>({
  type: {
    type: String,
    enum: ['single', 'double', 'triple', 'dormitory'],
    required: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  deposit: {
    type: Number,
    required: [true, 'Deposit is required'],
    min: [0, 'Deposit cannot be negative'],
  },
  availableRooms: {
    type: Number,
    required: [true, 'Available rooms count is required'],
    min: [0, 'Available rooms cannot be negative'],
  },
  totalRooms: {
    type: Number,
    required: [true, 'Total rooms count is required'],
    min: [1, 'Total rooms must be at least 1'],
  },
  amenities: [{
    type: String,
    trim: true,
  }],
  images: [{
    type: String,
    required: true,
  }],
});

const pgSchema = new Schema<IPG>({
  name: {
    type: String,
    required: [true, 'PG name is required'],
    trim: true,
    minlength: [3, 'PG name must be at least 3 characters long'],
    maxlength: [100, 'PG name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [20, 'Description must be at least 20 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  images: [{
    type: String,
    required: true,
  }],
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
  },
  amenities: {
    wifi: { type: Boolean, default: false },
    food: { type: Boolean, default: false },
    laundry: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    powerBackup: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
  },
  roomTypes: [roomTypeSchema],
  rules: [{
    type: String,
    trim: true,
  }],
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerPhone: {
    type: String,
    required: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative'],
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for search functionality
pgSchema.index({ 'location.city': 1, 'location.state': 1 });
pgSchema.index({ name: 'text', description: 'text' });
pgSchema.index({ rating: -1 });
pgSchema.index({ 'roomTypes.price': 1 });

export const PG = mongoose.model<IPG>('PG', pgSchema);
