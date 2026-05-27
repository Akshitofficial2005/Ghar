const express = require('express');
const PG = require('../models/PG');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all PGs (public route)
router.get('/', async (req, res) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
      search
    } = req.query;

    const filter = {
      isApproved: true,
      isActive: true
    };

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseInt(minPrice);
      if (maxPrice) priceFilter.$lte = parseInt(maxPrice);
      filter['roomTypes.price'] = priceFilter;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const pgs = await PG.find(filter)
      .populate('owner', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PG.countDocuments(filter);

    res.json({
      success: true,
      data: pgs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching PGs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching PG listings' 
    });
  }
});

// Get single PG by ID (public route)
router.get('/:id', async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id)
      .populate('owner', 'name email phoneNumber');

    if (!pg) {
      return res.status(404).json({ 
        success: false, 
        message: 'PG not found' 
      });
    }

    res.json({
      success: true,
      data: pg
    });
  } catch (error) {
    console.error('Error fetching PG:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching PG details' 
    });
  }
});

// Create new PG (public, no authentication required)
router.post('/', async (req, res) => {
  try {
    console.log('=== PG CREATION DEBUG ===');
    // No user context, public endpoint
    console.log('Request body keys:', Object.keys(req.body));
    
    const {
      name,
      description,
      location,
      pricePerMonth,
      totalRooms,
      availableRooms,
      amenities,
      images,
      contactNumber,
      rules
    } = req.body;

    // Enhanced validation
    const validationErrors = [];
    
    // Name validation - only characters allowed
    if (!name || name.trim() === '') {
      validationErrors.push('Name is required');
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      validationErrors.push('Name should contain only letters and spaces');
    }
    
    // Location validation
    if (!location || (typeof location === 'string' && location.trim() === '')) {
      validationErrors.push('Location is required');
    }
    
    // Price validation - only numbers allowed
    if (!pricePerMonth) {
      validationErrors.push('Price is required');
    } else if (isNaN(Number(pricePerMonth)) || Number(pricePerMonth) <= 0) {
      validationErrors.push('Price must be a valid positive number');
    }
    
    // Contact number validation - exactly 10 digits
    if (contactNumber) {
      if (!/^\d{10}$/.test(contactNumber)) {
        validationErrors.push('Contact number must be exactly 10 digits');
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Process location to match schema
    let locationData = {};
    if (typeof location === 'string') {
      const parts = location.split(',');
      locationData = {
        address: location.trim(),
        city: parts[0]?.trim() || 'Unknown',
        state: parts[1]?.trim() || 'Unknown',
        pincode: '000000'
      };
    } else if (typeof location === 'object') {
      locationData = {
        address: location.address || '',
        city: location.city || 'Unknown',
        state: location.state || 'Unknown',
        pincode: location.pincode || '000000'
      };
    }

    const normalizeAmenities = (input) => {
      const toBool = (v) => Boolean(v);
      const asArray = Array.isArray(input) ? input : [];
      const asObject = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

      return {
        wifi: asArray.includes('wifi') || toBool(asObject.wifi),
        food: asArray.includes('food') || toBool(asObject.food),
        parking: asArray.includes('parking') || toBool(asObject.parking),
        gym: asArray.includes('gym') || toBool(asObject.gym),
        ac: asArray.includes('ac') || toBool(asObject.ac),
        laundry: asArray.includes('laundry') || toBool(asObject.laundry),
        security: asArray.includes('security') || toBool(asObject.security),
        powerBackup: asArray.includes('powerBackup') || toBool(asObject.powerBackup)
      };
    };

    const normalizedAmenities = normalizeAmenities(amenities);

    // Create PG object with proper schema structure
    const pgData = {
      name: name.trim(),
      description: description || '',
      location: locationData,
      roomTypes: [{
        type: 'single',
        price: Number(pricePerMonth),
        deposit: Math.floor(Number(pricePerMonth) * 0.5),
        totalRooms: Number(totalRooms) || 1,
        availableRooms: Number(availableRooms) || 1,
        amenities: Object.keys(normalizedAmenities).filter((key) => normalizedAmenities[key])
      }],
      amenities: normalizedAmenities,
      images: images?.map(url => ({ url, publicId: '', isMain: false })) || [],
      rules: rules || [],
      isApproved: true, // Auto-approve for now
      isActive: true
    };

    console.log('Creating PG with data:', pgData);

    const pg = new PG(pgData);
    await pg.save();

    console.log('PG created successfully:', pg._id);

    res.status(201).json({
      success: true,
      message: 'PG listing created successfully',
      data: pg
    });
  } catch (error) {
    console.error('=== PG CREATION ERROR ===');
    console.error('Error details:', error);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check for MongoDB connection issues
    if (error.name === 'MongooseServerSelectionError') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again later.',
        error: 'Database unavailable'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create PG listing',
      error: error.message
    });
  }
});

// Get user's PGs (requires authentication)
router.get('/user/my-pgs', authMiddleware, async (req, res) => {
  try {
    const pgs = await PG.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pgs
    });
  } catch (error) {
    console.error('Error fetching user PGs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your PG listings'
    });
  }
});

// Update PG (requires authentication)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id);

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: 'PG not found'
      });
    }

    // Check if user owns this PG
    if (pg.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own PG listings'
      });
    }

    const updatedPG = await PG.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'PG updated successfully',
      data: updatedPG
    });
  } catch (error) {
    console.error('Error updating PG:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PG listing'
    });
  }
});

// Delete PG (requires authentication)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id);

    if (!pg) {
      return res.status(404).json({
        success: false,
        message: 'PG not found'
      });
    }

    // Check if user owns this PG
    if (pg.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own PG listings'
      });
    }

    await PG.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'PG listing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting PG:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PG listing'
    });
  }
});

module.exports = router;
