export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Basic auth endpoints
    if (req.method === 'GET' && req.url === '/api/auth/verify') {
      return res.json({ success: true, message: 'Auth service is working' });
    }
    
    if (req.method === 'GET' && req.url === '/api/auth/profile') {
      return res.json({ success: true, user: { id: '1', email: 'test@example.com' } });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
