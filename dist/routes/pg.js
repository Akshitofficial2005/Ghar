"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const PG_1 = require("../models/PG");
const Review_1 = require("../models/Review");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/', async (req, res, next) => {
    try {
        const { city, state, minPrice, maxPrice, wifi, food, parking, gym, ac, laundry, powerBackup, security, roomType, page = 1, limit = 10, sort = '-createdAt', search, } = req.query;
        const filter = { isApproved: true, isActive: true };
        if (city)
            filter['location.city'] = new RegExp(city, 'i');
        if (state)
            filter['location.state'] = new RegExp(state, 'i');
        if (minPrice || maxPrice) {
            filter['roomTypes.price'] = {};
            if (minPrice)
                filter['roomTypes.price'].$gte = parseInt(minPrice);
            if (maxPrice)
                filter['roomTypes.price'].$lte = parseInt(maxPrice);
        }
        if (wifi === 'true')
            filter['amenities.wifi'] = true;
        if (food === 'true')
            filter['amenities.food'] = true;
        if (parking === 'true')
            filter['amenities.parking'] = true;
        if (gym === 'true')
            filter['amenities.gym'] = true;
        if (ac === 'true')
            filter['amenities.ac'] = true;
        if (laundry === 'true')
            filter['amenities.laundry'] = true;
        if (powerBackup === 'true')
            filter['amenities.powerBackup'] = true;
        if (security === 'true')
            filter['amenities.security'] = true;
        if (roomType)
            filter['roomTypes.type'] = roomType;
        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { 'location.address': new RegExp(search, 'i') },
            ];
        }
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const pgs = await PG_1.PG.find(filter)
            .populate('ownerId', 'name email phone')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();
        const total = await PG_1.PG.countDocuments(filter);
        res.json({
            status: 'success',
            data: {
                pgs,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const pg = await PG_1.PG.findOne({
            _id: req.params.id,
            isApproved: true,
            isActive: true,
        }).populate('ownerId', 'name email phone avatar');
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found', 404);
        }
        const reviews = await Review_1.Review.find({ pgId: pg._id })
            .populate('userId', 'name avatar')
            .sort('-createdAt')
            .limit(10);
        res.json({
            status: 'success',
            data: {
                pg,
                reviews,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('owner'), [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('PG name must be between 3 and 100 characters'),
    (0, express_validator_1.body)('description')
        .trim()
        .isLength({ min: 20, max: 1000 })
        .withMessage('Description must be between 20 and 1000 characters'),
    (0, express_validator_1.body)('location.address')
        .trim()
        .notEmpty()
        .withMessage('Address is required'),
    (0, express_validator_1.body)('location.city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('location.state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),
    (0, express_validator_1.body)('location.pincode')
        .matches(/^\d{6}$/)
        .withMessage('Please enter a valid 6-digit pincode'),
    (0, express_validator_1.body)('ownerPhone')
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        const pgData = {
            ...req.body,
            ownerId: req.user._id,
            ownerName: req.user.name,
            isApproved: false,
        };
        const pg = new PG_1.PG(pgData);
        await pg.save();
        res.status(201).json({
            status: 'success',
            message: 'PG created successfully and sent for approval',
            data: { pg },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('owner'), async (req, res, next) => {
    try {
        const pg = await PG_1.PG.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
        });
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found or you do not have permission to edit', 404);
        }
        const { ownerId, ownerName, rating, reviewCount, isApproved, ...updateData } = req.body;
        Object.assign(pg, updateData);
        await pg.save();
        res.json({
            status: 'success',
            message: 'PG updated successfully',
            data: { pg },
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('owner'), async (req, res, next) => {
    try {
        const pg = await PG_1.PG.findOne({
            _id: req.params.id,
            ownerId: req.user._id,
        });
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found or you do not have permission to delete', 404);
        }
        pg.isActive = false;
        await pg.save();
        res.json({
            status: 'success',
            message: 'PG deactivated successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/reviews', async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const reviews = await Review_1.Review.find({ pgId: req.params.id })
            .populate('userId', 'name avatar')
            .sort('-createdAt')
            .skip(skip)
            .limit(limitNum);
        const total = await Review_1.Review.countDocuments({ pgId: req.params.id });
        res.json({
            status: 'success',
            data: {
                reviews,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/reviews', auth_1.authenticate, [
    (0, express_validator_1.body)('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('comment')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Comment must be between 10 and 1000 characters'),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        const pg = await PG_1.PG.findById(req.params.id);
        if (!pg) {
            throw (0, errorHandler_1.createError)('PG not found', 404);
        }
        const existingReview = await Review_1.Review.findOne({
            userId: req.user._id,
            pgId: req.params.id,
        });
        if (existingReview) {
            throw (0, errorHandler_1.createError)('You have already reviewed this PG', 400);
        }
        const review = new Review_1.Review({
            userId: req.user._id,
            pgId: req.params.id,
            rating: req.body.rating,
            comment: req.body.comment,
        });
        await review.save();
        const reviews = await Review_1.Review.find({ pgId: req.params.id });
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        pg.rating = Math.round(avgRating * 10) / 10;
        pg.reviewCount = reviews.length;
        await pg.save();
        res.status(201).json({
            status: 'success',
            message: 'Review added successfully',
            data: { review },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=pg.js.map