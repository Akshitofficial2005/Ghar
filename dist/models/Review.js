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
exports.Review = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const reviewSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pgId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
reviewSchema.index({ userId: 1, pgId: 1 }, { unique: true });
reviewSchema.index({ pgId: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
exports.Review = mongoose_1.default.model('Review', reviewSchema);
//# sourceMappingURL=Review.js.map