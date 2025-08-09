import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Disable SSL certificate validation globally for Node.js (AWS RDS compatibility)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const { Pool } = pkg;

// Database connection configuration
let dbConfig;

// Check if we have a DATABASE_URL (common in production/Vercel)
if (process.env.DATABASE_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false,
      // Complete SSL bypass for AWS RDS compatibility
      ca: undefined,
      cert: undefined,
      key: undefined,
      pfx: undefined,
      passphrase: undefined,
      servername: undefined,
      checkServerIdentity: function() { return undefined; },
      secureProtocol: 'TLSv1_2_method'
    } : false,
    // Serverless-friendly connection settings
    max: 1, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  // Use individual environment variables
  dbConfig = {
    host: process.env.DB_HOST?.trim(),
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME?.trim(),
    user: process.env.DB_USERNAME?.trim(),
    password: process.env.DB_PASSWORD?.trim(),
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false,
      requestCert: false,
      agent: false,
      // Complete SSL bypass for AWS RDS compatibility
      ca: undefined,
      cert: undefined,
      key: undefined,
      pfx: undefined,
      passphrase: undefined,
      servername: undefined,
      checkServerIdentity: function() { return undefined; },
      secureProtocol: 'TLSv1_2_method'
    } : false,
    // Serverless-friendly connection settings
    max: 1, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

// Database connection pool
const pool = new Pool({
  ...dbConfig,
  max: dbConfig.max || 1, // Use configured max or default to 1 for serverless
  idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
  connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 10000,
});

// Test database connection
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('💥 Database connection error:', err);
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.DEBUG_SQL === 'true') {
    console.log('📊 SQL Query:', { text, duration, rows: res.rowCount });
  }
  
  return res;
};

// Helper function to get a client from the pool
export const getClient = () => {
  return pool.connect();
};

// Helper function to ensure user exists in database
export const ensureUserExists = async (firebaseUid, email, displayName = null) => {
  const existingUser = await query(
    'SELECT id FROM users WHERE firebase_uid = $1',
    [firebaseUid]
  );

  if (existingUser.rows.length > 0) {
    return existingUser.rows[0].id;
  }

  // Create new user
  const newUser = await query(
    'INSERT INTO users (firebase_uid, email, display_name) VALUES ($1, $2, $3) RETURNING id',
    [firebaseUid, email, displayName]
  );

  return newUser.rows[0].id;
};

export default { query, getClient, ensureUserExists };
export { pool };
