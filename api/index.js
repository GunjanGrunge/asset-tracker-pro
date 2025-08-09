import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { processReceiptWithAI, testBedrockConnection } from '../backend/services/aiReceiptProcessor.js';
import { pool } from '../backend/config/database.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from '../backend/routes/auth.js';
import assetRoutes from '../backend/routes/assets.js';
import reminderRoutes from '../backend/routes/reminders.js';
import receiptRoutes from '../backend/routes/receipts.js';
import aiRoutes from '../backend/routes/ai.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer for file uploads
const upload = multer({
  dest: '/tmp',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Static files - serve the built frontend
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ai', aiRoutes);

// AI Receipt Processing - Now using Node.js with AWS Bedrock
app.post('/api/python/process-receipt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname || 'receipt';
    
    console.log('Processing receipt:', fileName);
    
    // Use Node.js AI implementation with AWS Bedrock
    const result = await processReceiptWithAI(filePath, fileName);
    
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({
        error: 'Failed to process receipt',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Error in receipt processing endpoint:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message 
    });
  }
});

// AI Service Health Check - Now checks AWS Bedrock
app.get('/api/python/health', async (req, res) => {
  try {
    const result = await testBedrockConnection();
    
    if (result.success) {
      res.json({
        status: 'healthy',
        service: 'AWS Bedrock AI Service',
        model: result.model,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        service: 'AWS Bedrock AI Service',
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'AWS Bedrock AI Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoints
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'connected',
      database: 'PostgreSQL',
      current_time: result.rows[0].current_time,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'PostgreSQL',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/test/bedrock', async (req, res) => {
  try {
    const result = await testBedrockConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Main health check for all services
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      frontend: 'healthy',
      backend: 'healthy',
      ai: 'healthy'
    },
    service: 'AssetTracker Unified API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// For Vercel serverless deployment
export default app;

// For local testing
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
