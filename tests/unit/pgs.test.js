const request = require('supertest');
const app = require('../../server-no-db');
const User = require('../../models/User');
const PG = require('../../models/PG');

describe('PG Routes', () => {
  let userToken;
  let ownerToken;
  let adminToken;
  let testPG;
  
  beforeEach(async () => {
    // Create test users
    const user = await User.create(testUtils.createTestUser());
    const owner = await User.create(testUtils.createTestUser({
      email: 'owner@example.com',
      role: 'owner'
    }));
    const admin = await User.create(testUtils.createTestUser({
      email: 'admin@example.com',
      role: 'admin'
    }));
    
    // Generate tokens
    userToken = testUtils.generateToken({ userId: user._id, role: 'user' });
    ownerToken = testUtils.generateToken({ userId: owner._id, role: 'owner' });
    adminToken = testUtils.generateToken({ userId: admin._id, role: 'admin' });
    
    // Create test PG
    testPG = await PG.create(testUtils.createTestPG({ owner: owner._id }));
  });
  
  describe('GET /api/pgs', () => {
    it('should get all approved PGs', async () => {
      const response = await request(app)
        .get('/api/pgs')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('approved');
    });
    
    it('should filter PGs by city', async () => {
      const response = await request(app)
        .get('/api/pgs?city=Test City')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(1);
    });
    
    it('should filter PGs by price range', async () => {
      const response = await request(app)
        .get('/api/pgs?minPrice=5000&maxPrice=15000')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(1);
    });
    
    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/pgs?page=1&limit=10')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });
  
  describe('GET /api/pgs/:id', () => {
    it('should get PG by ID', async () => {
      const response = await request(app)
        .get(`/api/pgs/${testPG._id}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(testPG.name);
    });
    
    it('should return 404 for non-existent PG', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/pgs/${fakeId}`)
        .expect(404);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('POST /api/pgs', () => {
    it('should create PG as owner', async () => {
      const pgData = testUtils.createTestPG();
      
      const response = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(pgData)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(pgData.name);
      expect(response.body.data.status).toBe('pending');
    });
    
    it('should not create PG without authentication', async () => {
      const pgData = testUtils.createTestPG();
      
      const response = await request(app)
        .post('/api/pgs')
        .send(pgData)
        .expect(401);
      
      expect(response.body.status).toBe('error');
    });
    
    it('should not create PG as regular user', async () => {
      const pgData = testUtils.createTestPG();
      
      const response = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(pgData)
        .expect(403);
      
      expect(response.body.status).toBe('error');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/pgs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('PUT /api/pgs/:id', () => {
    it('should update own PG as owner', async () => {
      const updateData = { name: 'Updated PG Name' };
      
      const response = await request(app)
        .put(`/api/pgs/${testPG._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(updateData.name);
    });
    
    it('should not update other owner\'s PG', async () => {
      const otherOwner = await User.create(testUtils.createTestUser({
        email: 'other@example.com',
        role: 'owner'
      }));
      const otherToken = testUtils.generateToken({ userId: otherOwner._id, role: 'owner' });
      
      const response = await request(app)
        .put(`/api/pgs/${testPG._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('DELETE /api/pgs/:id', () => {
    it('should delete own PG as owner', async () => {
      const response = await request(app)
        .delete(`/api/pgs/${testPG._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
    
    it('should delete any PG as admin', async () => {
      const response = await request(app)
        .delete(`/api/pgs/${testPG._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
  });
  
  describe('Search functionality', () => {
    it('should search PGs by name', async () => {
      const response = await request(app)
        .get('/api/pgs/search?q=Test')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should search PGs by location', async () => {
      const response = await request(app)
        .get('/api/pgs/search?location=Test City')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/pgs/search?q=NonExistentPG')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.length).toBe(0);
    });
  });
});
