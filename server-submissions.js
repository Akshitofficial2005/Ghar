const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// In-memory storage for submissions
let pgSubmissions = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit PG listing request
app.post('/api/pg-submissions', (req, res) => {
  try {
    console.log('PG Submission Request:', req.body);
    
    const submission = {
      id: `sub-${Date.now()}`,
      ...req.body,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    
    pgSubmissions.push(submission);
    console.log('PG Submission saved:', submission.id);
    
    res.status(201).json({ 
      success: true, 
      message: 'PG listing request submitted successfully',
      submissionId: submission.id 
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit PG listing request' 
    });
  }
});

// Get all submissions (for admin)
app.get('/api/pg-submissions', (req, res) => {
  try {
    res.json({
      success: true,
      submissions: pgSubmissions,
      total: pgSubmissions.length
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch submissions' 
    });
  }
});

// Get submission by ID
app.get('/api/pg-submissions/:id', (req, res) => {
  try {
    const submission = pgSubmissions.find(s => s.id === req.params.id);
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    res.json({
      success: true,
      submission
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch submission' 
    });
  }
});

// Update submission status
app.put('/api/pg-submissions/:id/status', (req, res) => {
  try {
    const { status, notes } = req.body;
    const submissionIndex = pgSubmissions.findIndex(s => s.id === req.params.id);
    
    if (submissionIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    pgSubmissions[submissionIndex] = {
      ...pgSubmissions[submissionIndex],
      status,
      notes,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Submission status updated',
      submission: pgSubmissions[submissionIndex]
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update submission' 
    });
  }
});

// Delete submission
app.delete('/api/pg-submissions/:id', (req, res) => {
  try {
    const submissionIndex = pgSubmissions.findIndex(s => s.id === req.params.id);
    
    if (submissionIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    pgSubmissions.splice(submissionIndex, 1);
    
    res.json({
      success: true,
      message: 'Submission deleted'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete submission' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PG Submissions Server running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /api/pg-submissions - Submit PG listing`);
  console.log(`   GET  /api/pg-submissions - Get all submissions`);
  console.log(`   GET  /api/pg-submissions/:id - Get submission by ID`);
  console.log(`   PUT  /api/pg-submissions/:id/status - Update status`);
  console.log(`   DELETE /api/pg-submissions/:id - Delete submission`);
});