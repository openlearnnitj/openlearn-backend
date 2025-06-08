"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMiddleware = exports.securityLogger = exports.securityHeaders = exports.validateApiKey = exports.ipWhitelist = exports.sanitizeInput = exports.createSizeLimitMiddleware = exports.speedLimiter = exports.expensiveOperationLimit = exports.uploadRateLimit = exports.apiRateLimit = exports.passwordResetRateLimit = exports.authRateLimit = exports.generalRateLimit = exports.helmetConfig = exports.corsOptions = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const config_1 = require("../config");
const common_1 = require("../utils/common");
/**
 * Security middleware configuration for OpenLearn backend
 *
 * This module implements comprehensive security measures:
 * - CORS configuration for frontend integration
 * - Security headers via Helmet.js
 * - Rate limiting to prevent abuse
 * - Request size limits
 * - Input sanitization helpers
 * - CSP (Content Security Policy) configuration
 */
/**
 * CORS configuration for React frontend
 * Allows secure cross-origin requests from the frontend application
 */
exports.corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = config_1.config.cors.allowedOrigins;
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    maxAge: 86400 // 24 hours
};
/**
 * Helmet configuration for security headers
 * Sets various HTTP headers to help protect against common attacks
 */
exports.helmetConfig = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: "no-referrer" }
});
/**
 * General API rate limiting
 * Prevents abuse by limiting requests per IP address
 */
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config_1.config.rateLimiting.general.max, // Limit each IP to requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: common_1.ErrorCodes.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for health checks and internal IPs
        return req.path === '/health' || req.ip === '127.0.0.1';
    }
});
/**
 * Strict rate limiting for authentication endpoints
 * Prevents brute force attacks on login/register
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config_1.config.rateLimiting.auth.max, // 5 attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        code: common_1.ErrorCodes.RATE_LIMIT_EXCEEDED
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});
/**
 * Password reset rate limiting
 * Prevents abuse of password reset functionality
 */
exports.passwordResetRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again later.',
        code: common_1.ErrorCodes.RATE_LIMIT_EXCEEDED
    },
    keyGenerator: (req) => {
        // Rate limit by email address for password reset
        return req.body.email || req.ip;
    }
});
/**
 * Advanced rate limiter for different endpoints
 * Uses rate-limiter-flexible for more sophisticated limiting
 */
class AdvancedRateLimiter {
    constructor() {
        this.limiters = new Map();
        // API endpoints limiter
        this.limiters.set('api', new rate_limiter_flexible_1.RateLimiterMemory({
            points: 100, // Number of requests
            duration: 60, // Per 60 seconds
            blockDuration: 60, // Block for 60 seconds
        }));
        // File upload limiter
        this.limiters.set('upload', new rate_limiter_flexible_1.RateLimiterMemory({
            points: 10, // 10 uploads
            duration: 60 * 60, // Per hour
            blockDuration: 60 * 60, // Block for 1 hour
        }));
        // Expensive operations limiter (search, reports)
        this.limiters.set('expensive', new rate_limiter_flexible_1.RateLimiterMemory({
            points: 20, // 20 requests
            duration: 60, // Per minute
            blockDuration: 5 * 60, // Block for 5 minutes
        }));
    }
    createMiddleware(limiterName) {
        return async (req, res, next) => {
            try {
                const limiter = this.limiters.get(limiterName);
                if (!limiter) {
                    return next();
                }
                const key = req.ip || 'unknown';
                await limiter.consume(key);
                next();
            }
            catch (rateLimiterRes) {
                const msBeforeNext = Math.round(rateLimiterRes.msBeforeNext) || 1;
                res.set('Retry-After', String(Math.round(msBeforeNext / 1000)));
                return next((0, common_1.createApiError)('Rate limit exceeded. Please try again later.', 429, common_1.ErrorCodes.RATE_LIMIT_EXCEEDED));
            }
        };
    }
}
const advancedLimiter = new AdvancedRateLimiter();
// Export rate limiting middleware for different use cases
exports.apiRateLimit = advancedLimiter.createMiddleware('api');
exports.uploadRateLimit = advancedLimiter.createMiddleware('upload');
exports.expensiveOperationLimit = advancedLimiter.createMiddleware('expensive');
/**
 * Slow down middleware - gradually increases response time for repeated requests
 * Works alongside rate limiting for better user experience
 */
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
});
/**
 * Request size limiting middleware
 * Prevents large payloads that could cause DoS
 */
const createSizeLimitMiddleware = (limit) => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength) {
            const sizeInBytes = parseInt(contentLength, 10);
            const limitInBytes = parseSize(limit);
            if (sizeInBytes > limitInBytes) {
                return next((0, common_1.createApiError)(`Request too large. Maximum size allowed: ${limit}`, 413, common_1.ErrorCodes.PAYLOAD_TOO_LARGE));
            }
        }
        next();
    };
};
exports.createSizeLimitMiddleware = createSizeLimitMiddleware;
/**
 * Helper function to parse size strings (e.g., "10mb", "1gb")
 */
function parseSize(size) {
    const units = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    };
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match)
        return 0;
    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';
    return Math.floor(value * (units[unit] || 1));
}
/**
 * Input sanitization middleware
 * Basic sanitization for common XSS and injection attempts
 */
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string')
            return str;
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
    };
    const sanitizeObject = (obj) => {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
/**
 * IP whitelist middleware for admin endpoints
 * Restricts access to certain IPs for sensitive operations
 */
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || '';
        if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
            return next((0, common_1.createApiError)('Access denied from this IP address', 403, common_1.ErrorCodes.IP_NOT_ALLOWED));
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
/**
 * API key validation middleware
 * For endpoints that require API key authentication (webhooks, integrations)
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return next((0, common_1.createApiError)('API key is required', 401, common_1.ErrorCodes.API_KEY_REQUIRED));
    }
    // In production, validate against database or environment variable
    const validApiKeys = config_1.config.api.validKeys || [];
    if (!validApiKeys.includes(apiKey)) {
        return next((0, common_1.createApiError)('Invalid API key', 401, common_1.ErrorCodes.INVALID_API_KEY));
    }
    next();
};
exports.validateApiKey = validateApiKey;
/**
 * Security headers middleware for API responses
 * Adds security-related headers to all responses
 */
const securityHeaders = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // API-specific headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};
exports.securityHeaders = securityHeaders;
/**
 * Request logging middleware for security monitoring
 * Logs suspicious requests and security events
 */
const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /(\.\.[\/\\])+/, // Directory traversal
        /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection
        /<script|javascript:|vbscript:|onload=|onerror=/i, // XSS attempts  
        /etc\/passwd|proc\/self|windows\/system32/i, // File inclusion
    ];
    const checkSuspicious = (value) => {
        return suspiciousPatterns.some(pattern => pattern.test(value));
    };
    const requestData = JSON.stringify({
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    if (checkSuspicious(requestData)) {
        console.warn('Suspicious request detected:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            timestamp: new Date(),
            body: req.body,
            query: req.query
        });
    }
    next();
};
exports.securityLogger = securityLogger;
/**
 * Export all security middleware for easy use
 */
exports.securityMiddleware = {
    cors: (0, cors_1.default)(exports.corsOptions),
    helmet: exports.helmetConfig,
    generalRateLimit: exports.generalRateLimit,
    authRateLimit: exports.authRateLimit,
    passwordResetRateLimit: exports.passwordResetRateLimit,
    apiRateLimit: exports.apiRateLimit,
    uploadRateLimit: exports.uploadRateLimit,
    expensiveOperationLimit: exports.expensiveOperationLimit,
    speedLimiter: exports.speedLimiter,
    sanitizeInput: exports.sanitizeInput,
    securityHeaders: exports.securityHeaders,
    securityLogger: exports.securityLogger,
    ipWhitelist: exports.ipWhitelist,
    validateApiKey: exports.validateApiKey,
    createSizeLimitMiddleware: exports.createSizeLimitMiddleware
};
