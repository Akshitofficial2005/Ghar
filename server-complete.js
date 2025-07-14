const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Data stores
let users = [];
let pgSubmissions = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// OLD PG ENDPOINT - DISABLED
app.post('/api/pgs', (req, res) => {
  res.status(410).json({ 
    success: false,
    message: 'PG creation endpoint disabled. Use submission form at /list-pg',
    redirect: '/list-pg'
  });
});

// NEW SUBMISSION SYSTEM
app.post('/api/pg-submissions', (req, res) => {
  try {
    const submission = {
      id: `sub-${Date.now()}`,
      ...req.body,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    
    pgSubmissions.push(submission);
    console.log('Submission saved:', submission.id);
    
    res.status(201).json({ 
      success: true, 
      message: 'PG listing request submitted successfully',
      submissionId: submission.id 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit' });
  }
});

app.get('/api/pg-submissions', (req, res) => {
  res.json({ success: true, submissions: pgSubmissions, total: pgSubmissions.length });
});

app.put('/api/pg-submissions/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const index = pgSubmissions.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }
  
  pgSubmissions[index] = { ...pgSubmissions[index], status, notes, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Status updated' });
});

app.delete('/api/pg-submissions/:id', (req, res) => {
  const index = pgSubmissions.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }
  
  pgSubmissions.splice(index, 1);
  res.json({ success: true, message: 'Submission deleted' });
});

// Initialize server
const initServer = async () => {
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    users.push({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@ghar.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Ghar Submission Server running on port ${PORT}`);
    console.log(`📋 Endpoints:`);
    console.log(`   POST /api/pg-submissions - Submit PG`);
    console.log(`   GET  /api/pg-submissions - Get submissions`);
    console.log(`   ❌  /api/pgs - DISABLED (returns 410)`);
  });
};

initServer();