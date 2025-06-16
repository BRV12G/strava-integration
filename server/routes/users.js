const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get user info
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userQuery = await pool.query(
      'SELECT id, email, name, profile_picture, strava_athlete_id FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userQuery.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;