"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logging = exports.api = exports.fileUpload = exports.rateLimiting = exports.cors = exports.redis = exports.auth = exports.jwt = exports.database = exports.app = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Validates and parses environment variables
 */
function validateConfig() {
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
    ];
    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
    return {
        // Application
        app: {
            env: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '3000', 10),
            name: process.env.APP_NAME || 'OpenLearn Backend',
        },
        // Database
        database: {
            url: process.env.DATABASE_URL,
        },
        // JWT
        jwt: {
            accessSecret: process.env.JWT_SECRET,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        },
        // Authentication
        auth: {
            requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
            passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h',
            maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
            lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15', 10) * 60 * 1000, // 15 minutes
        },
        // Redis
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
        },
        // CORS
        cors: {
            allowedOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        },
        // Rate Limiting
        rateLimiting: {
            general: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15', 10) * 60 * 1000,
                max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
            },
            auth: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
            },
        },
        // File Upload
        fileUpload: {
            maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
            uploadDir: process.env.UPLOAD_DIR || 'uploads',
            allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowedDocumentTypes: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ],
        },
        // API
        api: {
            validKeys: process.env.API_KEYS?.split(',') || [],
        },
        // Logging
        logging: {
            level: process.env.LOG_LEVEL || 'info',
        },
    };
}
exports.config = validateConfig();
// Export individual config sections for easier imports
exports.app = exports.config.app, exports.database = exports.config.database, exports.jwt = exports.config.jwt, exports.auth = exports.config.auth, exports.redis = exports.config.redis, exports.cors = exports.config.cors, exports.rateLimiting = exports.config.rateLimiting, exports.fileUpload = exports.config.fileUpload, exports.api = exports.config.api, exports.logging = exports.config.logging;
