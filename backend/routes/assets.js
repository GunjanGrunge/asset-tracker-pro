import express from 'express';
import Joi from 'joi';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { authenticateUser } from '../middleware/auth.js';
import { query, ensureUserExists } from '../config/database.js';

// Configure S3 client for cleanup operations
const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const router = express.Router();

// Validation schemas (matching frontend structure exactly)
const assetSchema = Joi.object({
  name: Joi.string().required().max(255),
  category: Joi.string().required().max(100),
  purchasePrice: Joi.number().positive().required(),
  purchaseDate: Joi.date().required(),
  description: Joi.string().optional().allow(''),
  model: Joi.string().optional().allow(''),
  serialNumber: Joi.string().optional().allow(''),
  warrantyExpiry: Joi.date().optional().allow(null),
  status: Joi.string().valid('active', 'sold', 'lost', 'broken').default('active')
});

const assetUpdateSchema = Joi.object({
  name: Joi.string().max(255),
  category: Joi.string().max(100),
  purchasePrice: Joi.number().positive(),
  purchaseDate: Joi.date(),
  description: Joi.string().allow(''),
  model: Joi.string().allow(''),
  serialNumber: Joi.string().allow(''),
  warrantyExpiry: Joi.date().allow(null),
  status: Joi.string().valid('active', 'sold', 'lost', 'broken'),
  salePrice: Joi.number().positive().allow(null),
  saleDate: Joi.date().allow(null)
});

// GET /api/assets - Get all assets for user
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    
    // Get assets with their associated documents
    const assetsResult = await query(`
      SELECT 
        id,
        name,
        category,
        purchase_price as "purchasePrice",
        purchase_date as "purchaseDate",
        status,
        description,
        model,
        serial_number as "serialNumber",
        warranty_expiry as "warrantyExpiry",
        sale_price as "salePrice",
        sale_date as "saleDate",
        receipt_url as "receiptUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM assets 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    // Get documents for each asset
    const assets = [];
    for (const asset of assetsResult.rows) {
      const documentsResult = await query(`
        SELECT 
          r.id,
          'receipt' as "type",
          r.filename,
          r.original_name as "originalName",
          r.s3_url as "url",
          r.created_at as "uploadDate"
        FROM receipts r
        JOIN asset_documents ad ON r.id = ad.document_id
        WHERE ad.asset_id = $1
        ORDER BY r.created_at DESC
      `, [asset.id]);

      assets.push({
        ...asset,
        documents: documentsResult.rows
      });
    }

    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/assets - Create new asset
router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('📝 Received asset data:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      console.log('📋 Failed field:', error.details[0].path);
      return res.status(400).json({ error: error.details[0].message });
    }

    console.log('✅ Validation passed, creating asset...');
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    const result = await query(`
      INSERT INTO assets (
        user_id, name, category, purchase_price, purchase_date, 
        description, model, serial_number, warranty_expiry, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        name,
        category,
        purchase_price as "purchasePrice",
        purchase_date as "purchaseDate",
        status,
        description,
        model,
        serial_number as "serialNumber",
        warranty_expiry as "warrantyExpiry",
        created_at as "createdAt"
    `, [
      userId,
      value.name,
      value.category,
      value.purchasePrice,
      value.purchaseDate,
      value.description || null,
      value.model || null,
      value.serialNumber || null,
      value.warrantyExpiry || null,
      value.status
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { error, value } = assetUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const assetId = req.params.id;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        const dbField = key === 'purchasePrice' ? 'purchase_price' :
                       key === 'purchaseDate' ? 'purchase_date' :
                       key === 'serialNumber' ? 'serial_number' :
                       key === 'warrantyExpiry' ? 'warranty_expiry' :
                       key === 'salePrice' ? 'sale_price' :
                       key === 'saleDate' ? 'sale_date' : key;
        
        updateFields.push(`${dbField} = $${paramCount}`);
        updateValues.push(val);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId, assetId);

    const result = await query(`
      UPDATE assets 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING 
        id,
        name,
        category,
        purchase_price as "purchasePrice",
        purchase_date as "purchaseDate",
        status,
        description,
        model,
        serial_number as "serialNumber",
        warranty_expiry as "warrantyExpiry",
        sale_price as "salePrice",
        sale_date as "saleDate",
        updated_at as "updatedAt"
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const assetId = req.params.id;

    console.log(`🗑️ Starting deletion for asset ID: ${assetId}, user ID: ${userId}`);

    // First, check if the asset exists
    const assetCheck = await query(
      'SELECT id, receipt_url FROM assets WHERE user_id = $1 AND id = $2',
      [userId, assetId]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assetCheck.rows[0];
    console.log(`📄 Asset found:`, asset);
    let deletedS3Files = 0;

    // Get all documents associated with this asset through the asset_documents table
    const documentsResult = await query(
      `SELECT r.s3_key, r.s3_url, r.id as receipt_id, r.original_name
       FROM receipts r 
       INNER JOIN asset_documents ad ON r.id = ad.document_id 
       WHERE ad.asset_id = $1 AND r.user_id = $2`,
      [assetId, userId]
    );

    console.log(`📋 Found ${documentsResult.rows.length} documents through asset_documents table:`, documentsResult.rows);

    // Delete all S3 files associated with this asset
    for (const doc of documentsResult.rows) {
      if (doc.s3_key) {
        try {
          const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: doc.s3_key,
          };
          console.log(`🗑️ Attempting to delete S3 object:`, deleteParams);
          await s3Client.send(new DeleteObjectCommand(deleteParams));
          console.log(`✅ Deleted S3 object: ${doc.s3_key}`);
          deletedS3Files++;
        } catch (s3Error) {
          console.error('⚠️ Failed to delete S3 object:', doc.s3_key, s3Error);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Also check if there's a direct receipt_url in the asset (legacy structure)
    if (asset.receipt_url) {
      console.log(`🔍 Checking direct receipt_url: ${asset.receipt_url}`);
      const directReceiptResult = await query(
        'SELECT s3_key, id FROM receipts WHERE s3_url = $1 AND user_id = $2',
        [asset.receipt_url, userId]
      );
      
      console.log(`📄 Direct receipt found:`, directReceiptResult.rows);
      
      if (directReceiptResult.rows.length > 0 && directReceiptResult.rows[0].s3_key) {
        try {
          const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: directReceiptResult.rows[0].s3_key,
          };
          console.log(`🗑️ Attempting to delete direct receipt S3 object:`, deleteParams);
          await s3Client.send(new DeleteObjectCommand(deleteParams));
          console.log(`✅ Deleted direct receipt S3 object: ${directReceiptResult.rows[0].s3_key}`);
          deletedS3Files++;
        } catch (s3Error) {
          console.error('⚠️ Failed to delete direct receipt S3 object:', s3Error);
        }
      }
    }

    // Delete asset_documents relationships (this will cascade to remove relationships)
    const assetDocsResult = await query(
      'DELETE FROM asset_documents WHERE asset_id = $1 RETURNING document_id',
      [assetId]
    );
    console.log(`🔗 Deleted ${assetDocsResult.rows.length} asset_documents relationships`);

    // Delete receipt records associated with this asset
    for (const doc of documentsResult.rows) {
      await query(
        'DELETE FROM receipts WHERE id = $1 AND user_id = $2',
        [doc.receipt_id, userId]
      );
      console.log(`📄 Deleted receipt record: ${doc.receipt_id}`);
    }

    // Delete direct receipt if it exists
    if (asset.receipt_url) {
      const directDeleteResult = await query(
        'DELETE FROM receipts WHERE s3_url = $1 AND user_id = $2 RETURNING id',
        [asset.receipt_url, userId]
      );
      console.log(`📄 Deleted direct receipt records: ${directDeleteResult.rows.length}`);
    }

    // Finally, delete the asset from database
    await query(
      'DELETE FROM assets WHERE user_id = $1 AND id = $2',
      [userId, assetId]
    );

    console.log(`✅ Asset deletion completed. S3 files deleted: ${deletedS3Files}`);

    res.json({ 
      success: true, 
      message: `Asset and ${deletedS3Files} associated file(s) deleted successfully`,
      deletedS3Files: deletedS3Files,
      deletedDocuments: documentsResult.rows.length
    });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// GET /api/assets/:id - Get single asset
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const assetId = req.params.id;

    const result = await query(`
      SELECT 
        id,
        name,
        category,
        purchase_price as "purchasePrice",
        purchase_date as "purchaseDate",
        status,
        description,
        model,
        serial_number as "serialNumber",
        warranty_expiry as "warrantyExpiry",
        sale_price as "salePrice",
        sale_date as "saleDate",
        receipt_url as "receiptUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM assets 
      WHERE user_id = $1 AND id = $2
    `, [userId, assetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

export default router;
