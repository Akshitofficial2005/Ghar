const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Clear database before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '1234567890',
    role: 'user',
    ...overrides
  }),
  
  createTestPG: (overrides = {}) => ({
    name: 'Test PG',
    description: 'A test PG',
    location: {
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      coordinates: [77.2090, 28.6139]
    },
    images: ['test-image.jpg'],
    amenities: {
      wifi: true,
      ac: true,
      food: true,
      parking: false
    },
    roomTypes: [{
      name: 'Single',
      price: 10000,
      capacity: 1,
      available: 5
    }],
    rating: 4.5,
    status: 'approved',
    ...overrides
  }),
  
  createTestBooking: (overrides = {}) => ({
    checkIn: new Date('2024-02-01'),
    checkOut: new Date('2024-02-28'),
    guests: 1,
    totalAmount: 10000,
    status: 'confirmed',
    paymentStatus: 'paid',
    ...overrides
  }),
  
  generateToken: (payload) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }
};
