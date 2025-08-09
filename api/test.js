// Test API endpoints individually
export default async function handler(req, res) {
  if (req.url === '/api/test/db') {
    try {
      // Test database connection
      const { Pool } = require('pg');
      
      let dbConfig;
      if (process.env.DATABASE_URL) {
        dbConfig = {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        };
      } else {
        dbConfig = {
          host: process.env.DB_HOST?.trim(),
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME?.trim(),
          user: process.env.DB_USERNAME?.trim(),
          password: process.env.DB_PASSWORD?.trim(),
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };
      }
      
      const pool = new Pool(dbConfig);
      const result = await pool.query('SELECT NOW()');
      await pool.end();
      
      res.json({ 
        status: 'success', 
        message: 'Database connected successfully',
        timestamp: result.rows[0].now,
        config: {
          host: dbConfig.host || 'using DATABASE_URL',
          database: dbConfig.database || 'using DATABASE_URL'
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message,
        stack: error.stack
      });
    }
  } else if (req.url === '/api/test/python') {
    try {
      // Test Python availability
      const { spawn } = require('child_process');
      
      const python = spawn('python', ['--version']);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          res.json({ 
            status: 'success', 
            message: 'Python is available',
            version: output.trim() || error.trim()
          });
        } else {
          res.status(500).json({ 
            status: 'error', 
            message: 'Python not available',
            error: error
          });
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to test Python',
        error: error.message
      });
    }
  } else {
    res.status(404).json({ message: 'Test endpoint not found' });
  }
}
