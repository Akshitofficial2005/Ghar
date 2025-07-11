import express, { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PG, IPG } from '../models/PG';
import { Review } from '../models/Review';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// @route   GET /api/pgs
// @desc    Get all PGs with filters
// @access  Public
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      city,
      state,
      minPrice,
      maxPrice,
      wifi,
      food,
      parking,
      gym,
      ac,
      laundry,
      powerBackup,
      security,
      roomType,
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
    } = req.query;

    // Build filter object
    const filter: any = { isApproved: true, isActive: true };

    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    if (state) filter['location.state'] = new RegExp(state as string, 'i');

    // Price filter
    if (minPrice || maxPrice) {
      filter['roomTypes.price'] = {};
      if (minPrice) filter['roomTypes.price'].$gte = parseInt(minPrice as string);
      if (maxPrice) filter['roomTypes.price'].$lte = parseInt(maxPrice as string);
    }

    // Amenities filter
    if (wifi === 'true') filter['amenities.wifi'] = true;
    if (food === 'true') filter['amenities.food'] = true;
    if (parking === 'true') filter['amenities.parking'] = true;
    if (gym === 'true') filter['amenities.gym'] = true;
    if (ac === 'true') filter['amenities.ac'] = true;
    if (laundry === 'true') filter['amenities.laundry'] = true;
    if (powerBackup === 'true') filter['amenities.powerBackup'] = true;
    if (security === 'true') filter['amenities.security'] = true;

    // Room type filter
    if (roomType) filter['roomTypes.type'] = roomType;

    // Search filter
    if (search) {
      filter.$or = [
        { name: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') },
        { 'location.address': new RegExp(search as string, 'i') },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const pgs = await PG.find(filter)
      .populate('ownerId', 'name email phone')
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await PG.countDocuments(filter);

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
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/pgs/:id
// @desc    Get single PG by ID
// @access  Public
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pg = await PG.findOne({
      _id: req.params.id,
      isApproved: true,
      isActive: true,
    }).populate('ownerId', 'name email phone avatar');

    if (!pg) {
      throw createError('PG not found', 404);
    }

    // Get reviews for this PG
    const reviews = await Review.find({ pgId: pg._id })
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
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/pgs
// @desc    Create a new PG
// @access  Private (Owner only)
router.post(
  '/',
  authenticate,
  authorize('owner'),
  [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('PG name must be between 3 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 1000 })
      .withMessage('Description must be between 20 and 1000 characters'),
    body('location.address')
      .trim()
      .notEmpty()
      .withMessage('Address is required'),
    body('location.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('location.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),
    body('location.pincode')
      .matches(/^\d{6}$/)
      .withMessage('Please enter a valid 6-digit pincode'),
    body('ownerPhone')
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const errors = validationResult(req);
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
        isApproved: false, // Requires admin approval
      };

      const pg = new PG(pgData);
      await pg.save();

      res.status(201).json({
        status: 'success',
        message: 'PG created successfully and sent for approval',
        data: { pg },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/pgs/:id
// @desc    Update a PG
// @access  Private (Owner only)
router.put(
  '/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pg = await PG.findOne({
        _id: req.params.id,
        ownerId: req.user._id,
      });

      if (!pg) {
        throw createError('PG not found or you do not have permission to edit', 404);
      }

      // Remove fields that shouldn't be updated directly
      const { ownerId, ownerName, rating, reviewCount, isApproved, ...updateData } = req.body;

      Object.assign(pg, updateData);
      await pg.save();

      res.json({
        status: 'success',
        message: 'PG updated successfully',
        data: { pg },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/pgs/:id
// @desc    Delete/Deactivate a PG
// @access  Private (Owner only)
router.delete(
  '/:id',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pg = await PG.findOne({
        _id: req.params.id,
        ownerId: req.user._id,
      });

      if (!pg) {
        throw createError('PG not found or you do not have permission to delete', 404);
      }

      // Soft delete - just deactivate
      pg.isActive = false;
      await pg.save();

      res.json({
        status: 'success',
        message: 'PG deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/pgs/:id/reviews
// @desc    Get reviews for a PG
// @access  Public
router.get('/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const reviews = await Review.find({ pgId: req.params.id })
      .populate('userId', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const total = await Review.countDocuments({ pgId: req.params.id });

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
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/pgs/:id/reviews
// @desc    Add a review for a PG
// @access  Private
router.post(
  '/:id/reviews',
  authenticate,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Comment must be between 10 and 1000 characters'),
  ],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      // Check if PG exists
      const pg = await PG.findById(req.params.id);
      if (!pg) {
        throw createError('PG not found', 404);
      }

      // Check if user already reviewed this PG
      const existingReview = await Review.findOne({
        userId: req.user._id,
        pgId: req.params.id,
      });

      if (existingReview) {
        throw createError('You have already reviewed this PG', 400);
      }

      const review = new Review({
        userId: req.user._id,
        pgId: req.params.id,
        rating: req.body.rating,
        comment: req.body.comment,
      });

      await review.save();

      // Update PG rating
      const reviews = await Review.find({ pgId: req.params.id });
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      pg.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal place
      pg.reviewCount = reviews.length;
      await pg.save();

      res.status(201).json({
        status: 'success',
        message: 'Review added successfully',
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
