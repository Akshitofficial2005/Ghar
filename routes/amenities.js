const express = require('express');
const Amenity = require('../models/Amenity');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all active amenities
router.get('/', async (req, res) => {
  try {
    const amenities = await Amenity.find({ isActive: true }).sort({ category: 1, name: 1 });
    
    // If no amenities found in database, return default amenities
    if (amenities.length === 0) {
      const defaultAmenities = [
        {
          _id: '1',
          name: 'WiFi',
          description: 'High-speed internet connectivity',
          monthlyCharge: 0,
          icon: '📶',
          category: 'basic',
          isActive: true
        },
        {
          _id: '2',
          name: 'Food/Meals',
          description: 'Home-cooked meals included',
          monthlyCharge: 3000,
          icon: '🍽️',
          category: 'basic',
          isActive: true
        },
        {
          _id: '3',
          name: 'Laundry',
          description: 'Washing and cleaning services',
          monthlyCharge: 500,
          icon: '👕',
          category: 'basic',
          isActive: true
        },
        {
          _id: '4',
          name: 'Parking',
          description: 'Dedicated parking space',
          monthlyCharge: 1000,
          icon: '🚗',
          category: 'basic',
          isActive: true
        },
        {
          _id: '5',
          name: 'Air Conditioning',
          description: 'Personal AC in room',
          monthlyCharge: 2000,
          icon: '❄️',
          category: 'premium',
          isActive: true
        }
      ];
      return res.json(defaultAmenities);
    }
    
    res.json(amenities);
  } catch (error) {
    console.error('Get amenities error:', error);
    // Return default amenities on database error
    const defaultAmenities = [
      {
        _id: '1',
        name: 'WiFi',
        description: 'High-speed internet connectivity',
        monthlyCharge: 0,
        icon: '📶',
        category: 'basic',
        isActive: true
      },
      {
        _id: '2',
        name: 'Food/Meals',
        description: 'Home-cooked meals included',
        monthlyCharge: 3000,
        icon: '🍽️',
        category: 'basic',
        isActive: true
      }
    ];
    res.json(defaultAmenities);
  }
});

// Get all amenities (admin only)
router.get('/all', auth, async (req, res) => {
  try {
    const amenities = await Amenity.find().sort({ category: 1, name: 1 });
    res.json(amenities);
  } catch (error) {
    console.error('Get all amenities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create amenity (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const amenity = new Amenity(req.body);
    await amenity.save();
    
    // Broadcast real-time update
    global.io?.emit('amenityUpdate', amenity);
    
    res.status(201).json(amenity);
  } catch (error) {
    console.error('Create amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update amenity (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const amenity = await Amenity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!amenity) {
      return res.status(404).json({ message: 'Amenity not found' });
    }
    
    // Broadcast real-time update
    global.io?.emit('amenityUpdate', amenity);
    
    res.json(amenity);
  } catch (error) {
    console.error('Update amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete amenity (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const amenity = await Amenity.findByIdAndDelete(req.params.id);
    
    if (!amenity) {
      return res.status(404).json({ message: 'Amenity not found' });
    }
    
    // Broadcast real-time update
    global.io?.emit('amenityDeleted', { id: req.params.id });
    
    res.json({ message: 'Amenity deleted successfully' });
  } catch (error) {
    console.error('Delete amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;