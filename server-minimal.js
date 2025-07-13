const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PG creation - accepts ANY data
app.post('/api/pgs', (req, res) => {
  console.log('PG Request:', req.body);
  
  const newPG = {
    id: `pg-${Date.now()}`,
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  console.log('Created PG:', newPG);
  res.status(201).json({ success: true, data: newPG, id: newPG.id });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});