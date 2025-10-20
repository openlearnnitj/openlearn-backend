import { Request, Response, NextFunction } from 'express';

/**
 * Monitoring Secret Middleware
 * 
 * Protects monitoring endpoints with X-API-Secret header authentication.
 * 
 * Special case: For /metrics endpoint, allows access from internal Docker network
 * (requests coming from prometheus container) without authentication.
 * This is safe because the Docker network is isolated and prometheus:9090 is not exposed externally.
 * 
 * For all other monitoring endpoints, requires X-API-Secret header.
 */
export function monitoringSecretMiddleware(req: Request, res: Response, next: NextFunction) {
  const secretHeader = req.header('X-API-Secret');
  const expectedSecret = process.env.MONITORING_API_SECRET;
  
  // Check if request is for /metrics endpoint
  const isMetricsEndpoint = req.path === '/metrics';
  
  // Allow internal Docker network access to /metrics without auth
  // Docker containers can access each other by service name (e.g., prometheus -> app:3000)
  // External requests will come through nginx with real client IPs
  if (isMetricsEndpoint) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    // If no X-Forwarded-For or X-Real-IP headers, this is a direct Docker network request
    // (Prometheus scraping from within the Docker network)
    const isInternalRequest = !forwardedFor && !realIp;
    
    if (isInternalRequest) {
      // Allow internal Docker network access without authentication
      return next();
    }
  }
  
  // For all other cases, require X-API-Secret authentication
  if (!secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({ 
      success: false, 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Invalid or missing API secret.' 
      } 
    });
  }
  
  next();
}
