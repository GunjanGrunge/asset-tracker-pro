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
    // Basic reminders endpoints
    if (req.method === 'GET') {
      return res.json({ 
        success: true, 
        reminders: [
          { id: 1, title: 'Sample Reminder', date: '2024-12-31', assetId: 1 }
        ]
      });
    }
    
    if (req.method === 'POST') {
      return res.json({ success: true, message: 'Reminder created', id: Date.now() });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Reminders API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
