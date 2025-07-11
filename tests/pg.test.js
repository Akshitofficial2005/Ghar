const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const PG = require('../models/PG');
const User = require('../models/User');

describe('PG Management', () => {
  let authToken;
  let ownerId;
  let pgId;

  beforeAll(async () => {
    // Create test owner
    const owner = new User({
      name: 'Test Owner',
      email: 'owner@test.com',
      password: 'password123',
      phone: '9876543210',
      role: 'owner'
    });
    await owner.save();
    ownerId = owner._id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@test.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await PG.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/pgs', () => {
    it('should create a new PG', async () => {
      const pgData = {
        name: 'Test PG',
        description: 'A test PG for testing',
        location: {
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        },
        roomTypes: [{
          type: 'single',
          price: 10000,
          deposit: 5000,
          totalRooms: 10,
          availableRooms: 10
        }],
        amenities: {
          wifi: true,
          food: true
        }
      };

      const response = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pgData)
        .expect(201);

      expect(response.body.pg.name).toBe(pgData.name);
      expect(response.body.pg.isApproved).toBe(false);
      pgId = response.body.pg._id;
    });

    it('should not create PG without authentication', async () => {
      const pgData = {
        name: 'Test PG 2',
        description: 'Another test PG'
      };

      await request(app)
        .post('/api/pgs')
        .send(pgData)
        .expect(401);
    });
  });

  describe('GET /api/pgs', () => {
    it('should get approved PGs only', async () => {
      // Approve the test PG
      await PG.findByIdAndUpdate(pgId, { isApproved: true });

      const response = await request(app)
        .get('/api/pgs')
        .expect(200);

      expect(response.body.pgs).toHaveLength(1);
      expect(response.body.pgs[0].isApproved).toBe(true);
    });

    it('should filter PGs by city', async () => {
      const response = await request(app)
        .get('/api/pgs?city=Test City')
        .expect(200);

      expect(response.body.pgs).toHaveLength(1);
      expect(response.body.pgs[0].location.city).toBe('Test City');
    });

    it('should filter PGs by price range', async () => {
      const response = await request(app)
        .get('/api/pgs?minPrice=5000&maxPrice=15000')
        .expect(200);

      expect(response.body.pgs).toHaveLength(1);
    });
  });

  describe('PUT /api/pgs/:id', () => {
    it('should update PG by owner', async () => {
      const updateData = {
        name: 'Updated Test PG',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/pgs/${pgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.pg.name).toBe(updateData.name);
    });

    it('should not update PG without authentication', async () => {
      await request(app)
        .put(`/api/pgs/${pgId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/pgs/:id', () => {
    it('should delete PG by owner', async () => {
      await request(app)
        .delete(`/api/pgs/${pgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedPG = await PG.findById(pgId);
      expect(deletedPG).toBeNull();
    });
  });
});