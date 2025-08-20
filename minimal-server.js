// Minimal Express server test
const express = require('express');

const app = express();
const port = 3006;

app.get('/test', (req, res) => {
  res.json({ message: 'Minimal server works!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Minimal health check' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal server listening on port ${port}`);
  console.log(`📍 Server address:`, server.address());
  
  // Test if server is actually reachable
  const http = require('http');
  const testReq = http.get(`http://localhost:${port}/test`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('🧪 Self-test result:', data);
    });
  });
  
  testReq.on('error', (err) => {
    console.error('❌ Self-test failed:', err.message);
  });
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('listening', () => {
  console.log('🎯 Server is listening!');
});
