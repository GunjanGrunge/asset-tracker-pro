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
    // Basic receipts endpoints
    if (req.method === 'GET') {
      return res.json({ 
        success: true, 
        receipts: [
          { id: 1, filename: 'receipt1.pdf', assetId: 1, uploadDate: '2024-01-01' }
        ]
      });
    }
    
    if (req.method === 'POST') {
      return res.json({ success: true, message: 'Receipt uploaded', id: Date.now() });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Receipts API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
