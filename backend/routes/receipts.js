import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { authenticateUser } from '../middleware/auth.js';
import { query, ensureUserExists } from '../config/database.js';

const router = express.Router();

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

// POST /api/receipts/upload - Upload document file (receipt, invoice, warranty, etc.)
router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const documentType = req.body.documentType || 'other'; // receipt, invoice, warranty, manual, other
    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop();
    const s3Key = `documents/${req.user.uid}/${documentType}/${fileId}.${fileExtension}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        userId: userId.toString(),
        originalName: req.file.originalname,
        documentType: documentType,
      },
    });

    await s3Client.send(uploadCommand);

    // Generate S3 URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${s3Key}`;

    // Save document metadata to database
    const result = await query(`
      INSERT INTO receipts (
        user_id, filename, original_name, file_size, 
        mime_type, s3_key, s3_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        filename,
        original_name as "originalName",
        file_size as "fileSize",
        mime_type as "mimeType",
        s3_url as "url",
        processed,
        created_at as "uploadDate"
    `, [
      userId,
      `${fileId}.${fileExtension}`,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      s3Key,
      s3Url
    ]);

    const document = {
      ...result.rows[0],
      type: documentType
    };

    res.status(201).json({
      success: true,
      ...document,
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/receipts - Get all receipts for user
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    
    const result = await query(`
      SELECT 
        r.id,
        r.filename,
        r.original_name as "originalName",
        r.file_size as "fileSize",
        r.mime_type as "mimeType",
        r.s3_url as "s3Url",
        r.processed,
        r.extracted_data as "extractedData",
        r.created_at as "createdAt",
        a.id as "assetId",
        a.name as "assetName"
      FROM receipts r
      LEFT JOIN asset_documents ad ON r.id = ad.document_id
      LEFT JOIN assets a ON ad.asset_id = a.id
      WHERE r.user_id = $1 
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// POST /api/receipts/:id/process - Process receipt with AI (mock for now)
router.post('/:id/process', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const receiptId = req.params.id;

    // Get receipt details
    const receiptResult = await query(
      'SELECT * FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    // Mock AI processing (replace with actual Bedrock + LlamaParser integration)
    let extractedData;
    
    if (process.env.MOCK_AI_RESPONSES === 'true') {
      // Mock extracted data
      extractedData = {
        name: 'iPhone 15 Pro',
        category: 'Electronics',
        price: 999.99,
        date: new Date().toISOString().split('T')[0],
        model: 'A3102',
        serialNumber: 'G6GZN8XHMD',
        warranty: '1 year',
        store: 'Apple Store',
        confidence: 0.95
      };
    } else {
      // TODO: Implement actual Bedrock + LlamaParser processing
      extractedData = await processReceiptWithAI(receipt.s3_url);
    }

    // Update receipt with extracted data
    const updateResult = await query(`
      UPDATE receipts 
      SET processed = true, extracted_data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING 
        id,
        processed,
        extracted_data as "extractedData"
    `, [JSON.stringify(extractedData), receiptId, userId]);

    res.json({
      success: true,
      receipt: updateResult.rows[0],
      extractedData,
      message: 'Receipt processed successfully'
    });

  } catch (error) {
    console.error('Process receipt error:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

// GET /api/receipts/:id/download - Get signed URL for receipt download
router.get('/:id/download', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const receiptId = req.params.id;

    // Get receipt details
    const result = await query(
      'SELECT s3_key, original_name FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = result.rows[0];

    // Generate signed URL for download
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: receipt.s3_key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    res.json({
      downloadUrl: signedUrl,
      filename: receipt.original_name
    });

  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// DELETE /api/receipts/:id - Delete receipt
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const receiptId = req.params.id;

    // Get receipt details for S3 cleanup
    const receiptResult = await query(
      'SELECT s3_key FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // TODO: Delete from S3 (optional - can be done via lifecycle policy)
    // const deleteCommand = new DeleteObjectCommand({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: receiptResult.rows[0].s3_key,
    // });
    // await s3Client.send(deleteCommand);

    // Delete from database
    await query(
      'DELETE FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );

    res.json({ success: true, message: 'Receipt deleted successfully' });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// POST /api/receipts/link - Link a document to an asset
router.post('/link', authenticateUser, async (req, res) => {
  try {
    const { documentId, assetId } = req.body;
    
    if (!documentId || !assetId) {
      return res.status(400).json({ error: 'Document ID and Asset ID are required' });
    }

    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    // Verify the document belongs to the user
    const documentCheck = await query(`
      SELECT id FROM receipts 
      WHERE id = $1 AND user_id = $2
    `, [documentId, userId]);

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Verify the asset belongs to the user
    const assetCheck = await query(`
      SELECT id FROM assets 
      WHERE id = $1 AND user_id = $2
    `, [assetId, userId]);

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or access denied' });
    }

    // Check if link already exists
    const existingLink = await query(`
      SELECT id FROM asset_documents 
      WHERE document_id = $1 AND asset_id = $2
    `, [documentId, assetId]);

    if (existingLink.rows.length > 0) {
      return res.status(409).json({ error: 'Document is already linked to this asset' });
    }

    // Create the link
    const result = await query(`
      INSERT INTO asset_documents (document_id, asset_id)
      VALUES ($1, $2)
      RETURNING id, created_at as "createdAt"
    `, [documentId, assetId]);

    res.status(201).json({
      success: true,
      link: result.rows[0],
      message: 'Document linked to asset successfully'
    });

  } catch (error) {
    console.error('Link document error:', error);
    res.status(500).json({ error: 'Failed to link document to asset' });
  }
});

// GET /api/receipts/asset/:assetId - Get all documents for an asset
router.get('/asset/:assetId', authenticateUser, async (req, res) => {
  try {
    const { assetId } = req.params;
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    // Verify the asset belongs to the user
    const assetCheck = await query(`
      SELECT id FROM assets 
      WHERE id = $1 AND user_id = $2
    `, [assetId, userId]);

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or access denied' });
    }

    // Get all documents linked to this asset
    const result = await query(`
      SELECT 
        r.id,
        r.filename,
        r.original_name as "originalName",
        r.file_size as "fileSize",
        r.mime_type as "mimeType",
        r.s3_url as "url",
        r.processed,
        r.created_at as "uploadDate",
        ad.created_at as "linkedDate"
      FROM receipts r
      JOIN asset_documents ad ON r.id = ad.document_id
      WHERE ad.asset_id = $1
      ORDER BY ad.created_at DESC
    `, [assetId]);

    res.json({
      success: true,
      documents: result.rows
    });

  } catch (error) {
    console.error('Get asset documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve asset documents' });
  }
});

// GET /api/receipts/view/:id - Get a secure, temporary URL to view a document
router.get('/view/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    // Verify the document belongs to the user
    const documentResult = await query(`
      SELECT 
        r.id,
        r.filename,
        r.original_name as "originalName",
        r.mime_type as "mimeType",
        r.s3_key as "s3Key"
      FROM receipts r
      WHERE r.id = $1 AND r.user_id = $2
    `, [id, userId]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const document = documentResult.rows[0];

    // Generate a signed URL for secure access (expires in 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: document.s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { 
      expiresIn: 3600 // 1 hour
    });

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        viewUrl: signedUrl
      }
    });

  } catch (error) {
    console.error('Get document view URL error:', error);
    res.status(500).json({ error: 'Failed to generate document view URL' });
  }
});

// GET /api/receipts/download/:id - Get a secure download URL for a document
router.get('/download/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    // Verify the document belongs to the user
    const documentResult = await query(`
      SELECT 
        r.id,
        r.filename,
        r.original_name as "originalName",
        r.mime_type as "mimeType",
        r.s3_key as "s3Key"
      FROM receipts r
      WHERE r.id = $1 AND r.user_id = $2
    `, [id, userId]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const document = documentResult.rows[0];

    // Generate a signed URL for download (expires in 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: document.s3Key,
      ResponseContentDisposition: `attachment; filename="${document.originalName}"`
    });

    const downloadUrl = await getSignedUrl(s3Client, getObjectCommand, { 
      expiresIn: 3600 // 1 hour
    });

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.originalName,
        downloadUrl: downloadUrl
      }
    });

  } catch (error) {
    console.error('Get document download URL error:', error);
    res.status(500).json({ error: 'Failed to generate document download URL' });
  }
});

// TODO: Implement actual AI processing function
async function processReceiptWithAI(s3Url) {
  // This will be implemented with AWS Bedrock + LlamaParser
  // For now, return mock data
  return {
    name: 'Extracted Product Name',
    category: 'Electronics',
    price: 0,
    date: new Date().toISOString().split('T')[0],
    confidence: 0.8
  };
}

export default router;
