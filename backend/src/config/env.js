import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3002', 10),
  API_URL: process.env.API_URL || 'http://localhost:3002',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'playwright_dashboard',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // Storage
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
  STORAGE_PATH: process.env.STORAGE_PATH || './uploads',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_BUCKET: process.env.AWS_BUCKET,

  // External APIs
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITLAB_TOKEN: process.env.GITLAB_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'noreply@playwright-dashboard.com',

  // Features
  ENABLE_WEBHOOKS: process.env.ENABLE_WEBHOOKS !== 'false',
  ENABLE_API_KEY_AUTH: process.env.ENABLE_API_KEY_AUTH !== 'false',
  MAX_ARTIFACT_SIZE: parseInt(process.env.MAX_ARTIFACT_SIZE || '5368709120', 10), // 5GB default

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

// Validate required environment variables in production
if (env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
}

export default env;
