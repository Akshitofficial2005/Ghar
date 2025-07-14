const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

let pgSubmissions = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OLD PG ENDPOINT - RETURN ERROR MESSAGE
app.post('/api/pgs', (req, res) => {
  console.log('⚠️ Old PG endpoint called - returning error message');
  res.status(410).json({ 
    success: false,
    message: 'PG creation has been moved to a new submission system. Please clear your browser cache and visit /list-pg',
    action: 'CLEAR_CACHE_AND_REFRESH',
    newUrl: '/list-pg'
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 NEW: POST /api/pg-submissions`);
  console.log(`⚠️  OLD: POST /api/pgs (returns 410)`);
});