// Initialize MongoDB data
const initializeMongoDBData = async (User, PG, Booking, bcrypt) => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'admin@ghar.com' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      
      // Create admin user
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@ghar.com',
        password: await bcrypt.hash('admin123', salt),
        role: 'admin',
        isActive: true
      });
      
      // Create owner user
      const owner = await User.create({
        name: 'PG Owner',
        email: 'owner@ghar.com',
        password: await bcrypt.hash('owner123', salt),
        role: 'owner',
        isActive: true
      });
      
      // Create regular user
      const user = await User.create({
        name: 'Demo User',
        email: 'user@demo.com',
        password: await bcrypt.hash('demo123', salt),
        role: 'user',
        isActive: true
      });
      
      // Create demo PG
      const pg1 = await PG.create({
        name: 'Sunrise PG',
        description: 'Comfortable PG for students',
        location: { 
          city: 'Mumbai', 
          address: 'Andheri West, Mumbai',
          state: 'Maharashtra',
          pincode: '400058',
          coordinates: { latitude: 19.1136, longitude: 72.8697 }
        },
        price: { monthly: 12000, security: 6000 },
        amenities: ['WiFi', 'Food', 'Laundry', 'Security'],
        images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop'],
        contact: {
          owner: 'PG Owner',
          phone: '9876543210',
          email: 'owner@ghar.com'
        },
        availability: {
          totalRooms: 10,
          availableRooms: 7
        },
        rating: 4.5,
        reviews: 25,
        verified: true,
        roomTypes: [
          { type: 'single', price: 12000, availableRooms: 5 },
          { type: 'double', price: 8000, availableRooms: 2 }
        ],
        owner: owner._id,
        status: 'approved',
        isApproved: true,
        isActive: true
      });
      
      // Create demo booking
      await Booking.create({
        userId: user._id,
        pgId: pg1._id,
        userName: 'Demo User',
        pgName: 'Sunrise PG',
        totalAmount: 12000,
        status: 'confirmed',
        checkIn: new Date('2024-02-01'),
        checkOut: new Date('2024-08-01')
      });
      
      console.log('✅ MongoDB demo data initialized successfully');
      console.log('👤 Admin login: admin@ghar.com / admin123');
      console.log('👤 Owner login: owner@ghar.com / owner123');
      console.log('👤 User login: user@demo.com / demo123');
    } else {
      console.log('✅ MongoDB demo data already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing MongoDB data:', error);
    throw error; // Re-throw to trigger fallback to in-memory data
  }
};

module.exports = initializeMongoDBData;