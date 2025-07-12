const express = require('express');
const PG = require('../models/PG');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all PGs with filters
router.get('/', async (req, res) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      wifi,
      food,
      parking,
      page = 1,
      limit = 12,
      search
    } = req.query;

    const filter = {
      isApproved: true,
      isActive: true
    };

    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.address': new RegExp(search, 'i') }
      ];
    }

    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseInt(minPrice);
      if (maxPrice) priceFilter.$lte = parseInt(maxPrice);
      filter['roomTypes.price'] = priceFilter;
    }

    if (wifi === 'true') filter['amenities.wifi'] = true;
    if (food === 'true') filter['amenities.food'] = true;
    if (parking === 'true') filter['amenities.parking'] = true;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const pgs = await PG.find(filter)
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PG.countDocuments(filter);

    res.json({
      pgs,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total
      }
    });
  } catch (error) {
    console.error('Get PGs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single PG
router.get('/:id', async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id)
      .populate('owner', 'name phone email');
    
    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    res.json({ pg });
  } catch (error) {
    console.error('Get PG error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create PG (Owner only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('PG Creation - User authenticated:', req.user._id, req.user.role);
    console.log('PG Creation - Request content type:', req.headers['content-type']);
    console.log('PG Creation - Request body keys:', Object.keys(req.body));
    
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      console.log('PG Creation - Access denied. User role:', req.user.role);
      return res.status(403).json({ message: 'Access denied. Only owners and admins can create PG listings.' });
    }

    console.log('PG Creation - Creating PG for user:', req.user._id);
    
    // Handle JSON request with base64 images
    const pgData = {
      ...req.body,
      owner: req.user._id,
      isApproved: false,
      isActive: false
    };
    
    // Convert base64 images to URLs (for now, just store as is)
    // In production, you would upload these to a cloud service like Cloudinary
    if (pgData.images && Array.isArray(pgData.images)) {
      console.log('PG Creation - Processing', pgData.images.length, 'images');
      // For now, keep the base64 images as they are
      // TODO: Implement proper image upload to cloud storage
    }

    console.log('PG Creation - Processed data:', {
      name: pgData.name,
      owner: pgData.owner,
      amenities: pgData.amenities,
      roomTypes: pgData.roomTypes
    });

    const pg = new PG(pgData);
    await pg.save();

    console.log('PG Creation - PG created successfully:', pg._id);
    res.status(201).json({ message: 'PG created successfully', pg });
  } catch (error) {
    console.error('Create PG error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Server error while creating PG',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update PG
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id);
    
    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    if (pg.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedPG = await PG.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({ message: 'PG updated successfully', pg: updatedPG });
  } catch (error) {
    console.error('Update PG error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete PG
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const pg = await PG.findById(req.params.id);
    
    if (!pg) {
      return res.status(404).json({ message: 'PG not found' });
    }

    if (pg.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await PG.findByIdAndDelete(req.params.id);
    res.json({ message: 'PG deleted successfully' });
  } catch (error) {
    console.error('Delete PG error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get owner's PGs (including pending)
router.get('/owner/my-pgs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pgs = await PG.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      pgs: pgs.map(pg => ({
        id: pg._id,
        name: pg.name,
        description: pg.description,
        location: `${pg.location.address}, ${pg.location.city}, ${pg.location.state}`,
        images: pg.images.map(img => img.url || img),
        status: pg.isApproved ? (pg.isActive ? 'active' : 'inactive') : 'pending',
        price: pg.roomTypes.length > 0 ? pg.roomTypes[0].price : 0,
        totalRooms: pg.roomTypes.reduce((sum, room) => sum + room.totalRooms, 0),
        occupiedRooms: pg.roomTypes.reduce((sum, room) => sum + (room.totalRooms - room.availableRooms), 0),
        rating: pg.rating.overall,
        createdAt: pg.createdAt,
        monthlyRevenue: pg.roomTypes.reduce((sum, room) => sum + ((room.totalRooms - room.availableRooms) * room.price), 0),
        inquiries: pg.viewCount || 0
      }))
    });
  } catch (error) {
    console.error('Get owner PGs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;