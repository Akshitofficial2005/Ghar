const request = require('supertest');
const app = require('../../server-no-db');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUtils.createTestUser();
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
    });
    
    it('should not register user with existing email', async () => {
      const userData = testUtils.createTestUser();
      
      // Create first user
      await User.create(userData);
      
      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });
    
    it('should validate email format', async () => {
      const userData = testUtils.createTestUser({ email: 'invalid-email' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('email');
    });
    
    it('should validate password length', async () => {
      const userData = testUtils.createTestUser({ password: '123' });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('password');
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const userData = testUtils.createTestUser();
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await User.create({
        ...userData,
        password: hashedPassword
      });
    });
    
    it('should login user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
    });
    
    it('should not login user with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should not login user with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      const userData = testUtils.createTestUser();
      await User.create(userData);
    });
    
    it('should send forgot password email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('reset email sent');
    });
    
    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
      
      expect(response.body.status).toBe('success');
    });
    
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should rate limit auth endpoints', async () => {
      const userData = testUtils.createTestUser();
      
      // Make multiple requests quickly
      const requests = Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: userData.email, password: userData.password })
      );
      
      const responses = await Promise.all(requests);
      
      // Should have at least one rate limited response
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.message).toContain('Too many');
    });
  });
});
