const mongoose = require('mongoose');

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // PG Collection Indexes
    await db.collection('pgs').createIndex({ 'location.city': 1 });
    await db.collection('pgs').createIndex({ 'location.coordinates': '2dsphere' });
    await db.collection('pgs').createIndex({ isApproved: 1, isActive: 1 });
    await db.collection('pgs').createIndex({ 'roomTypes.price': 1 });
    await db.collection('pgs').createIndex({ rating: -1 });
    await db.collection('pgs').createIndex({ createdAt: -1 });
    
    // User Collection Indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 });
    await db.collection('users').createIndex({ role: 1 });
    
    // Booking Collection Indexes
    await db.collection('bookings').createIndex({ userId: 1 });
    await db.collection('bookings').createIndex({ pgId: 1 });
    await db.collection('bookings').createIndex({ status: 1 });
    await db.collection('bookings').createIndex({ createdAt: -1 });
    
    // Compound Indexes
    await db.collection('pgs').createIndex({ 
      'location.city': 1, 
      'roomTypes.price': 1, 
      isApproved: 1 
    });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = { createIndexes };