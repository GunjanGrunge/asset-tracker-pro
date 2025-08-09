import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import multer from 'multer';
import fs from 'fs';

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ai', aiRoutes);

// Python AI service integration
app.post('/api/python/process-receipt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    
    // Try different Python script paths for different environments
    const possiblePaths = [
      path.join(__dirname, '../python-ai/simple_main.py'),
      path.join(process.cwd(), 'python-ai/simple_main.py'),
      './python-ai/simple_main.py'
    ];
    
    let pythonScriptPath = possiblePaths[0];
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        pythonScriptPath = testPath;
        break;
      }
    }
    
    console.log('Using Python script path:', pythonScriptPath);
    
    // Create a promise to handle the Python process
    const processFile = () => {
      return new Promise((resolve, reject) => {
        const python = spawn('python3', [pythonScriptPath, filePath], {
          env: { ...process.env }
        });
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
          output += data.toString();
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          // Clean up uploaded file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          if (code !== 0) {
            console.error('Python process failed:', error);
            reject(new Error(error || 'Python process failed'));
          } else {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (parseError) {
              console.error('Failed to parse Python output:', output);
              reject(new Error('Invalid JSON response from Python service'));
            }
          }
        });
      });
    };

    const result = await processFile();
    res.json(result);

  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message 
    });
  }
});

// Python AI health check
app.get('/api/python/health', async (req, res) => {
  try {
    const checkHealth = () => {
      return new Promise((resolve, reject) => {
        const python = spawn('python3', ['--version']);
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
          output += data.toString();
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(error || 'Python health check failed'));
          } else {
            resolve(output.trim() || error.trim());
          }
        });
      });
    };

    const result = await checkHealth();
    res.json({
      status: 'healthy',
      service: 'Python AI Service',
      message: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Try with 'python' instead of 'python3'
    try {
      const checkHealthFallback = () => {
        return new Promise((resolve, reject) => {
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
            if (code !== 0) {
              reject(new Error(error || 'Python health check failed'));
            } else {
              resolve(output.trim() || error.trim());
            }
          });
        });
      };

      const result = await checkHealthFallback();
      res.json({
        status: 'healthy',
        service: 'Python AI Service',
        message: result,
        timestamp: new Date().toISOString()
      });
    } catch (fallbackError) {
      res.status(500).json({
        status: 'unhealthy',
        service: 'Python AI Service',
        error: fallbackError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      frontend: 'healthy',
      backend: 'healthy',
      python: 'healthy'
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
