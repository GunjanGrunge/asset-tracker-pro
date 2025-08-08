import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Test authentication endpoint
router.get('/verify', authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name
    }
  });
});

// Get user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    // This would typically fetch additional user data from database
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name,
      createdAt: new Date().toISOString() // Placeholder
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
