/**
 * Rate Limiting Middleware
 * 
 * This module provides IP-based rate limiting for the OpenLearn API
 * to protect against abuse, DoS attacks, and excessive API usage.
 * 
 * Features:
 * - IP-based rate limiting with configurable windows and request limits
 * - Different rate limits for different endpoint types (auth, API, general)
 * - Trusted proxy support for accurate IP detection behind nginx/load balancers
 * - Environment-based configuration with sensible defaults
 * - Proper error responses with retry information
 * - Prometheus metrics integration for monitoring rate limit usage
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config/environment';
import { rateLimitExceededTotal, rateLimitHitsTotal } from '../metrics/rateLimitMetrics';

/**
 * Rate Limiting Configuration
 * 
 * These values can be overridden via environment variables for different deployments:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 * - RATE_LIMIT_AUTH_MAX: Max auth requests per window (default: 10)
 * - RATE_LIMIT_STRICT_MAX: Max requests for strict endpoints (default: 30)
 */
const RATE_LIMIT_CONFIG = {
  // General API rate limiting (15 minutes window)
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  
  // Authentication endpoints (more restrictive)
  authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10'), // 10 auth requests per window
  
  // Strict rate limiting for sensitive operations
  strictMaxRequests: parseInt(process.env.RATE_LIMIT_STRICT_MAX || '30'), // 30 requests per window
  
  // Skip rate limiting in development mode only if explicitly enabled
  skipInDevelopment: process.env.RATE_LIMIT_SKIP_DEV === 'true',
} as const;

/**
 * Standard Error Response Handler
 * 
 * Provides consistent error responses when rate limits are exceeded
 * Also tracks metrics for rate limit violations
 */
const createRateLimitErrorHandler = (endpointType: 'general' | 'auth' | 'strict') => {
  return (req: Request, res: Response) => {
    const retryAfter = Math.round(RATE_LIMIT_CONFIG.windowMs / 1000); // Convert to seconds
    
    // Track rate limit exceeded event (requests that were blocked)
    rateLimitExceededTotal.inc({
      endpoint_type: endpointType,
      path: req.path
    });
    
    // Track in general hits counter as blocked
    rateLimitHitsTotal.inc({
      endpoint_type: endpointType,
      status: 'blocked'
    });
    
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: retryAfter,
      resetTime: new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString(),
      details: {
        windowMs: RATE_LIMIT_CONFIG.windowMs,
        maxRequests: res.getHeader('X-RateLimit-Limit'),
        remainingRequests: res.getHeader('X-RateLimit-Remaining'),
        resetTime: res.getHeader('X-RateLimit-Reset')
      }
    });
  };
};

/**
 * Trust Proxy Configuration
 * 
 * When behind nginx or a load balancer, we need to trust the proxy
 * to get the real client IP from X-Forwarded-For headers
 */
const getTrustedKeyGenerator = () => {
  return (req: Request): string => {
    // Try multiple sources for getting the real client IP
    const forwardedIp = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
    const clientIp = req.ip;
    
    // Use the first IP in X-Forwarded-For chain (real client IP)
    if (forwardedIp) {
      const clientIp = forwardedIp.split(',')[0].trim();
      return clientIp;
    }
    
    // Fallback to other IP sources
    if (realIp) {
      return realIp;
    }
    
    if (clientIp) {
      return clientIp;
    }
    
    if (remoteAddress) {
      return remoteAddress;
    }
    
    // Final fallback for local development
    return 'unknown-' + Math.random().toString(36).substring(7);
  };
};

/**
 * General API Rate Limiter
 * 
 * Applied to most API endpoints with moderate restrictions
 * - 100 requests per 15 minutes per IP
 * - Standard headers for client-side rate limit handling
 */
const generalRateLimitBase = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.windowMs,
  max: RATE_LIMIT_CONFIG.maxRequests,
  handler: createRateLimitErrorHandler('general'),
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy X-RateLimit-* headers
  keyGenerator: getTrustedKeyGenerator(),
  skip: (req: Request) => {
    // Skip rate limiting in development if configured
    if (RATE_LIMIT_CONFIG.skipInDevelopment) {
      return true;
    }
    
    // Always allow health checks and status endpoints
    const skipPaths = ['/health', '/ping', '/status', '/favicon.ico'];
    return skipPaths.includes(req.path);
  }
});

// Wrap with metrics tracking for allowed requests
export const generalRateLimit = (req: Request, res: Response, next: any) => {
  // Track all rate limit checks
  rateLimitHitsTotal.inc({
    endpoint_type: 'general',
    status: 'allowed'
  });
  
  // Call the actual rate limiter
  generalRateLimitBase(req, res, next);
};

/**
 * Authentication Rate Limiter
 * 
 * Applied to authentication endpoints with strict restrictions
 * - 10 requests per 15 minutes per IP
 * - Protects against brute force attacks on login/signup
 */
const authRateLimitBase = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.windowMs,
  max: RATE_LIMIT_CONFIG.authMaxRequests,
  handler: createRateLimitErrorHandler('auth'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getTrustedKeyGenerator(),
  skip: (req: Request) => RATE_LIMIT_CONFIG.skipInDevelopment
});

// Wrap with metrics tracking for allowed requests
export const authRateLimit = (req: Request, res: Response, next: any) => {
  // Track all rate limit checks
  rateLimitHitsTotal.inc({
    endpoint_type: 'auth',
    status: 'allowed'
  });
  
  // Call the actual rate limiter
  authRateLimitBase(req, res, next);
};

/**
 * Strict Rate Limiter
 * 
 * Applied to sensitive operations requiring tighter controls
 * - 30 requests per 15 minutes per IP
 * - Used for admin operations, data modifications, etc.
 */
const strictRateLimitBase = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.windowMs,
  max: RATE_LIMIT_CONFIG.strictMaxRequests,
  handler: createRateLimitErrorHandler('strict'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getTrustedKeyGenerator(),
  skip: (req: Request) => RATE_LIMIT_CONFIG.skipInDevelopment
});

// Wrap with metrics tracking for allowed requests
export const strictRateLimit = (req: Request, res: Response, next: any) => {
  // Track all rate limit checks
  rateLimitHitsTotal.inc({
    endpoint_type: 'strict',
    status: 'allowed'
  });
  
  // Call the actual rate limiter
  strictRateLimitBase(req, res, next);
};

/**
 * Flexible Rate Limiter Factory
 * 
 * Creates custom rate limiters for specific use cases
 * 
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds (optional, defaults to config)
 * @param skipInDev - Whether to skip in development (optional, defaults to config)
 * @param endpointType - Type of endpoint for metrics tracking (defaults to 'general')
 * @returns Configured rate limiter middleware
 */
export const createCustomRateLimit = (
  maxRequests: number,
  windowMs: number = RATE_LIMIT_CONFIG.windowMs,
  skipInDev: boolean = RATE_LIMIT_CONFIG.skipInDevelopment,
  endpointType: 'general' | 'auth' | 'strict' = 'general'
) => {
  const rateLimiter = rateLimit({
    windowMs,
    max: maxRequests,
    handler: createRateLimitErrorHandler(endpointType),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getTrustedKeyGenerator(),
    skip: (req: Request) => skipInDev
  });
  
  // Return wrapped middleware with metrics
  return (req: Request, res: Response, next: any) => {
    // Track all rate limit checks
    rateLimitHitsTotal.inc({
      endpoint_type: endpointType,
      status: 'allowed'
    });
    
    // Call the actual rate limiter
    rateLimiter(req, res, next);
  };
};

/**
 * Rate Limiting Configuration Info
 * 
 * Export configuration for monitoring and debugging
 */
export const rateLimitInfo = {
  config: RATE_LIMIT_CONFIG,
  generalLimit: {
    windowMs: RATE_LIMIT_CONFIG.windowMs,
    maxRequests: RATE_LIMIT_CONFIG.maxRequests,
    description: 'General API endpoints'
  },
  authLimit: {
    windowMs: RATE_LIMIT_CONFIG.windowMs,
    maxRequests: RATE_LIMIT_CONFIG.authMaxRequests,
    description: 'Authentication endpoints (login, signup, etc.)'
  },
  strictLimit: {
    windowMs: RATE_LIMIT_CONFIG.windowMs,
    maxRequests: RATE_LIMIT_CONFIG.strictMaxRequests,
    description: 'Sensitive operations (admin, data modification, etc.)'
  }
};
