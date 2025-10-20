/**
 * Metrics Middleware
 * 
 * Express middleware that automatically collects HTTP metrics for every request.
 * This middleware should be added early in the middleware chain.
 */

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInFlight,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  httpErrorsTotal,
} from '../metrics/httpMetrics';

/**
 * Normalize route paths for metrics
 * Converts specific IDs to generic patterns for better aggregation
 * Example: /api/users/123 -> /api/users/:id
 */
function normalizeRoute(path: string, method: string): string {
  // Skip metrics endpoint itself
  if (path === '/metrics') return '/metrics';
  
  // Keep health/ping/status as-is
  if (path === '/health' || path === '/ping' || path === '/status') return path;
  
  // Replace UUIDs and numeric IDs with :id
  let normalized = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUID
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[a-f0-9]{24}/gi, '/:id'); // MongoDB ObjectIDs
  
  // Limit route length to prevent cardinality explosion
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...';
  }
  
  return normalized || 'unknown';
}

/**
 * Get request size from Content-Length header
 */
function getRequestSize(req: Request): number {
  const contentLength = req.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : 0;
}

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip collecting metrics for the metrics endpoint itself to avoid recursion
  if (req.path === '/metrics') {
    return next();
  }
  
  const startTime = Date.now();
  const method = req.method;
  const route = normalizeRoute(req.path, method);
  
  // Increment in-flight requests
  httpRequestsInFlight.inc({ method, route });
  
  // Record request size
  const requestSize = getRequestSize(req);
  if (requestSize > 0) {
    httpRequestSizeBytes.observe({ method, route }, requestSize);
  }
  
  // Hook into response finish event
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = res.statusCode.toString();
    
    // Decrement in-flight requests
    httpRequestsInFlight.dec({ method, route });
    
    // Record request duration
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Increment request counter
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    
    // Record response size if available
    const responseSize = parseInt(res.get('content-length') || '0', 10);
    if (responseSize > 0) {
      httpResponseSizeBytes.observe({ method, route, status_code: statusCode }, responseSize);
    }
    
    // Record errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpErrorsTotal.inc({ method, route, status_code: statusCode, error_type: errorType });
    }
  });
  
  next();
}
