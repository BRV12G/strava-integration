const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;

