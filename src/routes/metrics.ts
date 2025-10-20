/**
 * Metrics Routes
 * 
 * Prometheus metrics endpoint.
 * Protected by X-API-Secret header for security.
 */

import { Router, Request, Response } from 'express';
import { register } from '../metrics';
import { monitoringSecretMiddleware } from '../middleware/monitoringSecret';

const router = Router();

/**
 * GET /metrics
 * 
 * Returns Prometheus-formatted metrics
 * Requires X-API-Secret header for authentication
 * 
 * Usage with Prometheus:
 * scrape_configs:
 *   - job_name: 'openlearn-api'
 *     static_configs:
 *       - targets: ['api.openlearn.org.in']
 *     headers:
 *       X-API-Secret: <MONITORING_API_SECRET>
 */
router.get('/metrics', monitoringSecretMiddleware, async (req: Request, res: Response) => {
  try {
    // Set content type to Prometheus format
    res.set('Content-Type', register.contentType);
    
    // Return all collected metrics
    res.end(await register.metrics());
  } catch (error) {
    console.error('❌ Error generating metrics:', error);
    res.status(500).end(error);
  }
});

export default router;
