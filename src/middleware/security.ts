import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config';
import { ErrorCodes, createApiError } from '../utils/common';

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
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.cors.allowedOrigins;
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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
export const helmetConfig = helmet({
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
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimiting.general.max, // Limit each IP to requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
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
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimiting.auth.max, // 5 attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Password reset rate limiting
 * Prevents abuse of password reset functionality
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    code: ErrorCodes.RATE_LIMIT_EXCEEDED
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
  private limiters: Map<string, RateLimiterMemory> = new Map();

  constructor() {
    // API endpoints limiter
    this.limiters.set('api', new RateLimiterMemory({
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 60, // Block for 60 seconds
    }));

    // File upload limiter
    this.limiters.set('upload', new RateLimiterMemory({
      points: 10, // 10 uploads
      duration: 60 * 60, // Per hour
      blockDuration: 60 * 60, // Block for 1 hour
    }));

    // Expensive operations limiter (search, reports)
    this.limiters.set('expensive', new RateLimiterMemory({
      points: 20, // 20 requests
      duration: 60, // Per minute
      blockDuration: 5 * 60, // Block for 5 minutes
    }));
  }

  createMiddleware(limiterName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limiter = this.limiters.get(limiterName);
        if (!limiter) {
          return next();
        }

        const key = req.ip || 'unknown';
        await limiter.consume(key);
        next();
      } catch (rateLimiterRes: any) {
        const msBeforeNext = Math.round(rateLimiterRes.msBeforeNext) || 1;
        res.set('Retry-After', String(Math.round(msBeforeNext / 1000)));
        
        return next(createApiError(
          'Rate limit exceeded. Please try again later.',
          429,
          ErrorCodes.RATE_LIMIT_EXCEEDED
        ));
      }
    };
  }
}

const advancedLimiter = new AdvancedRateLimiter();

// Export rate limiting middleware for different use cases
export const apiRateLimit = advancedLimiter.createMiddleware('api');
export const uploadRateLimit = advancedLimiter.createMiddleware('upload');
export const expensiveOperationLimit = advancedLimiter.createMiddleware('expensive');

/**
 * Slow down middleware - gradually increases response time for repeated requests
 * Works alongside rate limiting for better user experience
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

/**
 * Request size limiting middleware
 * Prevents large payloads that could cause DoS
 */
export const createSizeLimitMiddleware = (limit: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = parseSize(limit);
      
      if (sizeInBytes > limitInBytes) {
        return next(createApiError(
          `Request too large. Maximum size allowed: ${limit}`,
          413,
          ErrorCodes.PAYLOAD_TOO_LARGE
        ));
      }
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings (e.g., "10mb", "1gb")
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * (units[unit] || 1));
}

/**
 * Input sanitization middleware
 * Basic sanitization for common XSS and injection attempts
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
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

  // Sanitize query parameters - handle read-only property safely
  if (req.query && Object.keys(req.query).length > 0) {
    const sanitizedQuery = sanitizeObject(req.query);
    // Clear existing query properties and replace with sanitized ones
    Object.keys(req.query).forEach(key => {
      delete (req.query as any)[key];
    });
    Object.assign(req.query, sanitizedQuery);
  }

  next();
};

/**
 * IP whitelist middleware for admin endpoints
 * Restricts access to certain IPs for sensitive operations
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
      return next(createApiError(
        'Access denied from this IP address',
        403,
        ErrorCodes.IP_NOT_ALLOWED
      ));
    }
    
    next();
  };
};

/**
 * API key validation middleware
 * For endpoints that require API key authentication (webhooks, integrations)
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(createApiError(
      'API key is required',
      401,
      ErrorCodes.API_KEY_REQUIRED
    ));
  }

  // In production, validate against database or environment variable
  const validApiKeys = config.api.validKeys || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return next(createApiError(
      'Invalid API key',
      401,
      ErrorCodes.INVALID_API_KEY
    ));
  }

  next();
};

/**
 * Security headers middleware for API responses
 * Adds security-related headers to all responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
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

/**
 * Request logging middleware for security monitoring
 * Logs suspicious requests and security events
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\.\.[\/\\])+/,  // Directory traversal
    /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection
    /<script|javascript:|vbscript:|onload=|onerror=/i, // XSS attempts  
    /etc\/passwd|proc\/self|windows\/system32/i, // File inclusion
  ];

  const checkSuspicious = (value: string): boolean => {
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

/**
 * CORS middleware handler
 * Configured CORS middleware ready to use
 */
export const corsHandler = cors(corsOptions);

/**
 * Request logger middleware
 * Logs incoming requests for debugging and monitoring
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request details
  console.log(`📥 ${req.method} ${req.path} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
    console.log(`📤 ${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

/**
 * Export all security middleware for easy use
 */
export const securityMiddleware = {
  cors: cors(corsOptions),
  corsHandler,
  helmet: helmetConfig,
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  uploadRateLimit,
  expensiveOperationLimit,
  speedLimiter,
  sanitizeInput,
  securityHeaders,
  securityLogger,
  requestLogger,
  ipWhitelist,
  validateApiKey,
  createSizeLimitMiddleware
};
