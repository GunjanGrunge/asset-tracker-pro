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
    // Basic AI endpoints
    if (req.method === 'POST' && req.url?.includes('/parse')) {
      return res.json({ 
        success: true, 
        extractedData: {
          vendor: 'Sample Store',
          total: '99.99',
          date: '2024-01-01',
          items: ['Sample Item']
        }
      });
    }
    
    if (req.method === 'GET') {
      return res.json({ success: true, message: 'AI service is running' });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
