const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file (check local backend/.env and root .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/preply',
  jwtSecret: process.env.JWT_SECRET || 'preply_dev_default_jwt_secret_change_in_prod_32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
};

if (config.env === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('preply_dev_default')) {
    console.error('[CRITICAL SECURITY ERROR] Insecure or default JWT_SECRET detected in production environment.');
    process.exit(1);
  }
}

module.exports = config;
