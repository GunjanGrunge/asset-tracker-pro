import express from 'express';
import multer from 'multer';
import ReceiptParserService from '../services/receiptParser.js';

const router = express.Router();

// Configure multer for memory storage (we'll process the file directly)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        const allowedMimes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'));
        }
    }
});

// Initialize the receipt parser service
const receiptParser = new ReceiptParserService();

/**
 * POST /api/parse-receipt
 * Parse receipt/invoice using Python AI service with LlamaIndex and AWS Bedrock
 */
router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
    try {
        console.log('Received receipt parsing request');
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please upload a receipt, invoice, or warranty card.'
            });
        }

        console.log(`Processing file: ${req.file.originalname}, MIME: ${req.file.mimetype}, Size: ${req.file.size} bytes`);

        // Validate file size
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size allowed is 10MB.'
            });
        }

        // Forward the request to Python AI service
        const FormData = require('form-data');
        const fetch = require('node-fetch');
        
        const formData = new FormData();
        formData.append('receipt', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        console.log('🤖 Forwarding to Python AI service...');
        
        const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${pythonServiceUrl}/parse-receipt`, {
            method: 'POST',
            body: formData,
            timeout: 60000 // 60 second timeout
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Python AI service error' }));
            throw new Error(errorData.detail || errorData.message || 'Python AI service failed');
        }

        const result = await response.json();
        
        console.log('✅ Python AI parsing completed successfully');
        
        // Return the result with additional metadata
        res.json({
            success: true,
            message: 'Receipt parsed successfully using Python AI + LlamaIndex + AWS Bedrock',
            data: {
                ...result.data,
                originalFilename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                // Include the file buffer as base64 for frontend upload
                fileData: req.file.buffer.toString('base64'),
                processingMethod: 'Python + LlamaIndex + AWS Bedrock'
            }
        });

    } catch (error) {
        console.error('Error in Python AI receipt parsing route:', error);
        
        // Handle specific error types
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            return res.status(503).json({
                success: false,
                message: 'Python AI service is not running. Please start the Python service on port 8000.',
                hint: 'Run: cd python-ai && python main.py'
            });
        }
        
        if (error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. The document processing took too long. Please try with a smaller file.'
            });
        }
        
        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('access') || error.message.includes('credentials')) {
            return res.status(500).json({
                success: false,
                message: 'AWS Bedrock access denied. Please check your credentials and model permissions.'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing the receipt with Python AI service.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/parse-receipt/health
 * Health check for the receipt parsing service
 */
router.get('/health', async (req, res) => {
    try {
        // Simple health check
        res.json({
            success: true,
            message: 'Receipt parsing service is healthy',
            service: 'AWS Bedrock Nova Lite',
            model: process.env.AWS_BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0',
            region: process.env.AWS_BEDROCK_REGION || 'us-east-1'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Receipt parsing service is unhealthy',
            error: error.message
        });
    }
});

export default router;
