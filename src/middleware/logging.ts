import { Request, Response, NextFunction } from 'express';
import { logRequest, logError } from '../config/logger';
import config from '../config/environment';

/**
 * Request logging middleware for OpenLearn API
 * Logs incoming requests and their responses with timing information
 * Skipped in test environment to keep test output clean
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Skip logging in test environment to avoid cluttering test output
  if (config.nodeEnv === 'test') {
    return next();
  }

  // Capture start time for performance measurement
  const startTime = Date.now();
  
  // Log the incoming request details
  logRequest(req);
  
  // Listen for the 'finish' event which fires when response is complete
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Create comprehensive response log with timing and status
    const logMessage = [
      `[${new Date().toISOString()}]`,
      `RESPONSE:`,
      `${req.method}`,
      `${req.url}`,
      `-`,
      `${res.statusCode}`,
      `(${duration}ms)`
    ].join(' ');
    
    // Use appropriate log level based on status code
    if (res.statusCode >= 400) {
      console.error(`❌ ${logMessage}`);
    } else if (res.statusCode >= 300) {
      console.warn(`⚠️ ${logMessage}`);
    } else {
      console.log(`✅ ${logMessage}`);
    }
  });
  
  // Continue to next middleware
  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with context
  logError(error, `${req.method} ${req.url}`);
  
  // Pass error to next middleware
  next(error);
};

// Performance monitoring middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  if (!config.isDevelopment) {
    return next();
  }
  
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    if (duration > 1000) { // Log slow requests (> 1 second)
      console.warn(`⚠️ Slow request: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
};
