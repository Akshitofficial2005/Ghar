const request = require('supertest');
const app = require('../../server-no-db');
const User = require('../../models/User');
const PG = require('../../models/PG');
const Booking = require('../../models/Booking');

describe('Integration Tests', () => {
  let userToken;
  let ownerToken;
  let adminToken;
  let testUser;
  let testOwner;
  let testAdmin;
  let testPG;
  
  beforeEach(async () => {
    // Create test users
    testUser = await User.create(testUtils.createTestUser());
    testOwner = await User.create(testUtils.createTestUser({
      email: 'owner@example.com',
      role: 'owner'
    }));
    testAdmin = await User.create(testUtils.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    }));
    
    // Generate tokens
    userToken = testUtils.generateToken({ userId: testUser._id, role: 'user' });
    ownerToken = testUtils.generateToken({ userId: testOwner._id, role: 'owner' });
    adminToken = testUtils.generateToken({ userId: testAdmin._id, role: 'admin' });
    
    // Create test PG
    testPG = await PG.create(testUtils.createTestPG({ owner: testOwner._id }));
  });
  
  describe('Complete Booking Flow', () => {
    it('should complete entire booking process', async () => {
      // Step 1: User searches for PGs
      const searchResponse = await request(app)
        .get('/api/pgs?city=Test City')
        .expect(200);
      
      expect(searchResponse.body.data.length).toBe(1);
      const foundPG = searchResponse.body.data[0];
      
      // Step 2: User views PG details
      const detailsResponse = await request(app)
        .get(`/api/pgs/${foundPG._id}`)
        .expect(200);
      
      expect(detailsResponse.body.data.name).toBe(foundPG.name);
      
      // Step 3: User creates a booking
      const bookingData = testUtils.createTestBooking({
        pgId: foundPG._id,
        userId: testUser._id
      });
      
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(201);
      
      expect(bookingResponse.body.status).toBe('success');
      expect(bookingResponse.body.data.pgId).toBe(foundPG._id);
      expect(bookingResponse.body.data.userId).toBe(testUser._id.toString());
      
      // Step 4: User views their bookings
      const userBookingsResponse = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(userBookingsResponse.body.data.length).toBe(1);
      expect(userBookingsResponse.body.data[0].pgId).toBe(foundPG._id);
      
      // Step 5: Owner views bookings for their PG
      const ownerBookingsResponse = await request(app)
        .get('/api/bookings/owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      
      expect(ownerBookingsResponse.body.data.length).toBe(1);
      expect(ownerBookingsResponse.body.data[0].pgId).toBe(foundPG._id);
    });
    
    it('should handle booking conflicts', async () => {
      // Create first booking
      const bookingData1 = testUtils.createTestBooking({
        pgId: testPG._id,
        userId: testUser._id,
        checkIn: new Date('2024-03-01'),
        checkOut: new Date('2024-03-15')
      });
      
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData1)
        .expect(201);
      
      // Try to create overlapping booking
      const bookingData2 = testUtils.createTestBooking({
        pgId: testPG._id,
        userId: testUser._id,
        checkIn: new Date('2024-03-10'),
        checkOut: new Date('2024-03-25')
      });
      
      const conflictResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData2)
        .expect(400);
      
      expect(conflictResponse.body.status).toBe('error');
      expect(conflictResponse.body.message).toContain('conflict');
    });
  });
  
  describe('Admin Management Flow', () => {
    it('should complete admin approval process', async () => {
      // Step 1: Owner creates PG (starts as pending)
      const pgData = testUtils.createTestPG({ status: 'pending' });
      const createResponse = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(pgData)
        .expect(201);
      
      expect(createResponse.body.data.status).toBe('pending');
      const pendingPG = createResponse.body.data;
      
      // Step 2: Admin views pending PGs
      const pendingResponse = await request(app)
        .get('/api/admin/pgs/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(pendingResponse.body.data.length).toBeGreaterThan(0);
      
      // Step 3: Admin approves PG
      const approvalResponse = await request(app)
        .put(`/api/admin/pgs/${pendingPG._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(approvalResponse.body.data.status).toBe('approved');
      
      // Step 4: Verify PG is now visible in public listings
      const publicResponse = await request(app)
        .get('/api/pgs')
        .expect(200);
      
      const approvedPGs = publicResponse.body.data.filter(pg => pg.status === 'approved');
      expect(approvedPGs.length).toBeGreaterThan(0);
    });
    
    it('should handle admin rejection process', async () => {
      // Create pending PG
      const pgData = testUtils.createTestPG({ status: 'pending' });
      const createResponse = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(pgData)
        .expect(201);
      
      const pendingPG = createResponse.body.data;
      
      // Admin rejects PG
      const rejectionResponse = await request(app)
        .put(`/api/admin/pgs/${pendingPG._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Does not meet standards' })
        .expect(200);
      
      expect(rejectionResponse.body.data.status).toBe('rejected');
      
      // Verify PG is not in public listings
      const publicResponse = await request(app)
        .get('/api/pgs')
        .expect(200);
      
      const rejectedPG = publicResponse.body.data.find(pg => pg._id === pendingPG._id);
      expect(rejectedPG).toBeUndefined();
    });
  });
  
  describe('User Journey Tests', () => {
    it('should complete user registration and profile setup', async () => {
      // Step 1: User registers
      const userData = testUtils.createTestUser({ email: 'newuser@example.com' });
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(registerResponse.body.data.token).toBeDefined();
      const newUserToken = registerResponse.body.data.token;
      
      // Step 2: User updates profile
      const profileUpdate = {
        name: 'Updated Name',
        phone: '9876543210'
      };
      
      const updateResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send(profileUpdate)
        .expect(200);
      
      expect(updateResponse.body.data.name).toBe(profileUpdate.name);
      expect(updateResponse.body.data.phone).toBe(profileUpdate.phone);
      
      // Step 3: User views profile
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);
      
      expect(profileResponse.body.data.name).toBe(profileUpdate.name);
      expect(profileResponse.body.data.phone).toBe(profileUpdate.phone);
    });
  });
  
  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid MongoDB ObjectIds', async () => {
      const response = await request(app)
        .get('/api/pgs/invalid-id')
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid ID');
    });
    
    it('should handle large payload attacks', async () => {
      const largePayload = { data: 'x'.repeat(15 * 1024 * 1024) }; // 15MB
      
      const response = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(largePayload)
        .expect(413);
      
      expect(response.body.status).toBe('error');
    });
    
    it('should handle concurrent booking attempts', async () => {
      const bookingData = testUtils.createTestBooking({
        pgId: testPG._id,
        userId: testUser._id
      });
      
      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userToken}`)
          .send(bookingData)
      );
      
      const responses = await Promise.all(requests);
      
      // Only one should succeed
      const successCount = responses.filter(res => res.status === 201).length;
      expect(successCount).toBe(1);
      
      // Others should fail with conflict
      const conflictCount = responses.filter(res => res.status === 400).length;
      expect(conflictCount).toBe(4);
    });
  });
});
