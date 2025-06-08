import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import apiRouter from './routes';
import {
  requestLogger,
  securityHeaders,
  corsHandler,
  sanitizeInput,
  generalRateLimit as rateLimiter,
  errorHandler as globalErrorHandler,
  notFoundHandler
} from './middleware';

/**
 * Create and configure Express application
 * This function sets up all middleware, routes, and error handling
 */
function createApp(): express.Application {
  const app = express();

  // ========================================
  // BASIC MIDDLEWARE SETUP
  // ========================================
  
  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set('trust proxy', true);
  
  // Parse JSON payloads (with size limit for security)
  app.use(express.json({ 
    limit: '10mb',
    strict: true 
  }));
  
  // Parse URL-encoded payloads
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));
  
  // Enable gzip compression for better performance
  app.use(compression());

  // ========================================
  // SECURITY MIDDLEWARE
  // ========================================
  
  // Helmet.js for security headers (additional to our custom security middleware)
  app.use(helmet({
    // Configure Content Security Policy
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
    // Configure Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false,
  }));
  
  // Our custom security headers middleware
  app.use(securityHeaders);
  
  // CORS configuration
  app.use(corsHandler);
  
  // Request logging for all routes
  app.use(requestLogger);
  
  // Input sanitization
  app.use(sanitizeInput);
  
  // Global rate limiting (more specific rate limits are applied per route)
  app.use(rateLimiter);

  // ========================================
  // HEALTH CHECK ENDPOINT
  // ========================================
  
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'OpenLearn API is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // ========================================
  // API ROUTES
  // ========================================
  
  // Mount all API routes under /api prefix
  app.use('/api', apiRouter);

  // ========================================
  // ERROR HANDLING MIDDLEWARE
  // ========================================
  
  // Handle 404 errors for unmatched routes
  app.use(notFoundHandler);
  
  // Global error handler (must be last middleware)
  app.use(globalErrorHandler);

  return app;
}

export default createApp;
