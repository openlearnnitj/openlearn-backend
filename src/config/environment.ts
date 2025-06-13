import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
  nodeEnv: string;
  redisUrl?: string;
  logLevel: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL,
  logLevel: process.env.LOG_LEVEL || 'info',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

// Add production-specific validation
if (config.isProduction) {
  requiredEnvVars.push('JWT_REFRESH_SECRET', 'CORS_ORIGIN');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (config.isProduction) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  } else {
    console.warn(`⚠️ Warning: Missing environment variables in development mode`);
  }
}

export default config;
