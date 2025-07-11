const http = require('http');

// Create API server (port 5001)
const apiServer = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Health check endpoint
  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  // Google auth endpoint
  if (url.pathname === '/api/auth/google' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { credential } = JSON.parse(body);
        
        if (!credential) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Credential is required' }));
          return;
        }
        
        // Parse JWT token
        const parts = credential.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          user: {
            id: payload.sub || 'user-id',
            name: payload.name || 'User',
            email: payload.email || 'user@example.com',
            role: 'user',
            phone: '',
            createdAt: new Date().toISOString()
          },
          token: 'auth_token_' + Date.now()
        }));
      } catch (error) {
        console.error('Auth error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication failed' }));
      }
    });
    
    return;
  }
  
  // Default response for unknown endpoints
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server (port 3000)
const wsServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Start servers
apiServer.listen(5001, () => {
  console.log('API server running at http://localhost:5001');
});

wsServer.listen(3000, () => {
  console.log('WebSocket server running at http://localhost:3000');
});

console.log('Press Ctrl+C to stop the servers');