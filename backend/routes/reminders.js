import express from 'express';
import Joi from 'joi';
import { authenticateUser } from '../middleware/auth.js';
import { query, ensureUserExists } from '../config/database.js';

const router = express.Router();

// Validation schemas (matching frontend structure exactly)
const reminderSchema = Joi.object({
  assetId: Joi.number().integer().positive().required(),
  title: Joi.string().required().max(255),
  description: Joi.string().optional().allow('', null), // Allow empty string and null
  dueDate: Joi.string().required(), // Accept string date from frontend
  type: Joi.string().required().max(50),
  recurring: Joi.boolean().default(false),
  frequency: Joi.string().valid('monthly', 'quarterly', 'yearly').allow(null).when('recurring', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const reminderUpdateSchema = Joi.object({
  assetId: Joi.number().integer().positive(),
  title: Joi.string().max(255),
  description: Joi.string().allow('', null), // Allow empty string and null
  dueDate: Joi.string(), // Accept string date from frontend
  type: Joi.string().max(50),
  completed: Joi.boolean(),
  recurring: Joi.boolean(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'yearly').allow(null)
});

// GET /api/reminders - Get all reminders for user
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    
    const result = await query(`
      SELECT 
        r.id,
        r.asset_id as "assetId",
        r.title,
        r.description,
        r.due_date as "dueDate",
        r.type,
        r.completed,
        r.completed_date as "completedDate",
        r.recurring,
        r.frequency,
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        a.name as "assetName"
      FROM reminders r
      LEFT JOIN assets a ON r.asset_id = a.id
      WHERE r.user_id = $1 
      ORDER BY r.due_date ASC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders - Create new reminder
router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('📝 Creating reminder with data:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = reminderSchema.validate(req.body);
    if (error) {
      console.error('❌ Validation error:', error.details[0].message);
      return res.status(400).json({ error: error.details[0].message });
    }

    console.log('✅ Validation passed, validated data:', JSON.stringify(value, null, 2));

    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);

    // Verify asset belongs to user
    const assetCheck = await query(
      'SELECT id FROM assets WHERE id = $1 AND user_id = $2',
      [value.assetId, userId]
    );

    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const result = await query(`
      INSERT INTO reminders (
        user_id, asset_id, title, description, due_date, 
        type, recurring, frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        asset_id as "assetId",
        title,
        description,
        due_date as "dueDate",
        type,
        completed,
        recurring,
        frequency,
        created_at as "createdAt"
    `, [
      userId,
      value.assetId,
      value.title,
      value.description || null,
      value.dueDate,
      value.type,
      value.recurring,
      value.frequency || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { error, value } = reminderUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const reminderId = req.params.id;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        const dbField = key === 'assetId' ? 'asset_id' :
                       key === 'dueDate' ? 'due_date' :
                       key === 'completedDate' ? 'completed_date' : key;
        
        updateFields.push(`${dbField} = $${paramCount}`);
        updateValues.push(val);
        paramCount++;
      }
    });

    // Handle completion timestamp
    if (value.completed !== undefined) {
      if (value.completed && !value.completedDate) {
        updateFields.push(`completed_date = CURRENT_TIMESTAMP`);
      } else if (!value.completed) {
        updateFields.push(`completed_date = NULL`);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId, reminderId);

    const result = await query(`
      UPDATE reminders 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING 
        id,
        asset_id as "assetId",
        title,
        description,
        due_date as "dueDate",
        type,
        completed,
        completed_date as "completedDate",
        recurring,
        frequency,
        updated_at as "updatedAt"
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const reminderId = req.params.id;

    const result = await query(
      'DELETE FROM reminders WHERE user_id = $1 AND id = $2 RETURNING id',
      [userId, reminderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// GET /api/reminders/upcoming - Get upcoming reminders (next 7 days)
router.get('/upcoming', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    
    const result = await query(`
      SELECT 
        r.id,
        r.asset_id as "assetId",
        r.title,
        r.description,
        r.due_date as "dueDate",
        r.type,
        r.completed,
        a.name as "assetName"
      FROM reminders r
      LEFT JOIN assets a ON r.asset_id = a.id
      WHERE r.user_id = $1 
        AND r.completed = false
        AND r.due_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY r.due_date ASC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get upcoming reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
  }
});

// POST /api/reminders/:id/complete - Mark reminder as complete
router.post('/:id/complete', authenticateUser, async (req, res) => {
  try {
    const userId = await ensureUserExists(req.user.uid, req.user.email, req.user.name);
    const reminderId = req.params.id;

    const result = await query(`
      UPDATE reminders 
      SET completed = true, completed_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND id = $2 AND completed = false
      RETURNING 
        id,
        asset_id as "assetId",
        title,
        completed,
        completed_date as "completedDate"
    `, [userId, reminderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found or already completed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete reminder error:', error);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

export default router;
