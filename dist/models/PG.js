"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PG = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const roomTypeSchema = new mongoose_1.Schema({
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
const pgSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
pgSchema.index({ 'location.city': 1, 'location.state': 1 });
pgSchema.index({ name: 'text', description: 'text' });
pgSchema.index({ rating: -1 });
pgSchema.index({ 'roomTypes.price': 1 });
exports.PG = mongoose_1.default.model('PG', pgSchema);
//# sourceMappingURL=PG.js.map