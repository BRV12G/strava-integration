const admin = require('firebase-admin'); 
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db');


// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Get all activities for user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    // Get user's Strava tokens from database
    const userQuery = await pool.query(
      'SELECT strava_access_token, strava_refresh_token, strava_token_expires_at FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].strava_access_token) {
      return res.status(400).json({ error: 'Strava not connected' });
    }

    let { strava_access_token, strava_refresh_token, strava_token_expires_at } = userQuery.rows[0];

    // Check if token needs refreshing
    if (Date.now() / 1000 > strava_token_expires_at) {
      const refreshResponse = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: strava_refresh_token
      });

      const { access_token, refresh_token, expires_at } = refreshResponse.data;
      strava_access_token = access_token;
      strava_refresh_token = refresh_token || strava_refresh_token;
      strava_token_expires_at = expires_at;

      // Update database with new tokens
      await pool.query(
        'UPDATE users SET strava_access_token = $1, strava_refresh_token = $2, strava_token_expires_at = $3 WHERE firebase_uid = $4',
        [strava_access_token, strava_refresh_token, strava_token_expires_at, req.user.uid]
      );
    }

    // Get activities from Strava
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities?', {
      headers: { Authorization: `Bearer ${strava_access_token}` }
    });

    res.json(activitiesResponse.data);
  } catch (error) {
    console.error('Error getting activities:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Update an activity
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, start_date_local, elapsed_time, description, distance } = req.body;

    // Get user's Strava access token
    const userQuery = await pool.query(
      'SELECT strava_access_token FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].strava_access_token) {
      return res.status(400).json({ error: 'Strava not connected' });
    }

    const { strava_access_token } = userQuery.rows[0];

    // Update activity on Strava
    const updateResponse = await axios.put(
      `https://www.strava.com/api/v3/activities/${id}`,
      { name, type, start_date_local, elapsed_time, description, distance },
      { headers: { Authorization: `Bearer ${strava_access_token}` } }
    );

    res.json(updateResponse.data);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Manual sync
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  try {
    // Similar to GET / but forces a refresh
    // Implementation similar to GET / endpoint
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing activities:', error);
    res.status(500).json({ error: 'Failed to sync activities' });
  }
});

module.exports = router;