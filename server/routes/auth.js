const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const axios = require('axios');
const { pool } = require('../db');

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};


// Google login callback
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Check if user exists in PostgreSQL
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (userQuery.rows.length === 0) {
      // New user - create in PostgreSQL
      await pool.query(
        'INSERT INTO users (firebase_uid, email, name, profile_picture, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [uid, email, name, picture]
      );
    }

    res.status(200).json({ success: true, uid });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Strava OAuth initiation
// router.get('/strava', (req, res) => {
//   const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&response_type=code&scope=activity:read_all,activity:write&approval_prompt=force`;
//   res.redirect(stravaAuthUrl);
// });

router.get('/strava', verifyFirebaseToken, (req, res) => {
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${
    process.env.STRAVA_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(process.env.STRAVA_REDIRECT_URI)
  }&response_type=code&scope=activity:read_all,activity:write&state=${
    req.user.uid // Use verified UID from middleware
  }`;
  
  res.redirect(stravaAuthUrl);
});







// // Strava OAuth callback
// router.get('/strava/callback', async (req, res) => {
//   try {
//     const { code, state } = req.query;
//     const  uid  = state;

//     if (!code || !uid) {
//       throw new Error('Authorization code or user ID  not found');
//     }

//     // Exchange code for tokens
//     const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
//       client_id: process.env.STRAVA_CLIENT_ID,
//       client_secret: process.env.STRAVA_CLIENT_SECRET,
//       code,
//       grant_type: 'authorization_code'
//     });

//     const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

//     // Store Strava tokens in database
//     await pool.query(
//       'UPDATE users SET strava_access_token = $1, strava_refresh_token = $2, strava_token_expires_at = $3, strava_athlete_id = $4 WHERE firebase_uid = $5',
//       [access_token, refresh_token, expires_at, athlete.id, uid]
//     );

//     // Redirect to frontend with success
//     res.redirect(`http://localhost:5173/activities?strava_connected=true`);
//   } catch (error) {
//     console.error('Strava auth error:', error);
//     res.redirect(`http://localhost:5173/error?message=${encodeURIComponent(error.message)}`);
//   }
// });





// / Strava OAuth callback (with enhanced logging)
router.get('/strava/callback', async (req, res) => {
  try {
    const { code, state: uid } = req.query;
    
    if (!code || !uid) {
      throw new Error('Missing code or user ID');
    }

    console.log('Starting Strava callback for user:', uid);

    // 1. Exchange code for tokens
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    // 2. Save to database
    const updateResult = await pool.query(
      `UPDATE users 
       SET strava_access_token = $1,
           strava_refresh_token = $2,
           strava_token_expires_at = $3,
           strava_athlete_id = $4
       WHERE firebase_uid = $5
       RETURNING id, strava_athlete_id`,
      [access_token, refresh_token, expires_at, athlete.id, uid]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('User not found - could not update Strava tokens');
    }

    console.log('Strava connection saved for user:', uid);
    res.redirect(`http://localhost:5173/activities?strava_connected=true`);
  } catch (error) {
    console.error('Strava callback failed:', {
      error: error.message,
      stack: error.stack
    });
    res.redirect(`http://localhost:5173/error?message=strava_connection_failed`);
  }
});

module.exports = router;

