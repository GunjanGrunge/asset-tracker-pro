import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    // Check if all required Firebase environment variables are present
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID', 
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing Firebase environment variables:', missingVars);
      throw new Error(`Missing Firebase configuration: ${missingVars.join(', ')}`);
    }

    // For development - using environment variables
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    console.log('🔥 Initializing Firebase Admin with project:', process.env.FIREBASE_PROJECT_ID);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin;
};

// Middleware to verify Firebase token
export const authenticateUser = async (req, res, next) => {
  try {
    // Development bypass - skip Firebase entirely
    if (process.env.BYPASS_AUTH === 'true') {
      console.log('🔓 Auth bypassed - using development user');
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@test.com',
        name: 'Development User'
      };
      return next();
    }

    // Only initialize Firebase if bypass is not enabled
    let firebaseAdmin;
    try {
      firebaseAdmin = initializeFirebase();
    } catch (firebaseError) {
      console.error('🔥 Firebase initialization failed:', firebaseError.message);
      return res.status(500).json({ 
        error: 'Authentication service unavailable',
        details: firebaseError.message 
      });
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export default { authenticateUser };
