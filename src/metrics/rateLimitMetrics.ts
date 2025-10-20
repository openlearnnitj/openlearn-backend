/**
 * Rate Limiting Metrics
 * 
 * Prometheus metrics for rate limiting operations.
 * Tracks rate limit hits, remaining quotas, and blocked requests.
 */

import { Counter } from 'prom-client';
import { register, METRICS_CONFIG } from './index';

const prefix = METRICS_CONFIG.prefix;

/**
 * Rate limit exceeded counter
 * Total number of requests that exceeded rate limits
 * Labels: endpoint_type (general, auth, strict), path
 */
export const rateLimitExceededTotal = new Counter({
  name: `${prefix}rate_limit_exceeded_total`,
  help: 'Total number of requests that exceeded rate limits',
  labelNames: ['endpoint_type', 'path'],
  registers: [register],
});

/**
 * Rate limit hits counter
 * Total number of requests processed by rate limiter
 * Labels: endpoint_type (general, auth, strict), status (allowed/blocked)
 */
export const rateLimitHitsTotal = new Counter({
  name: `${prefix}rate_limit_hits_total`,
  help: 'Total number of rate limit checks',
  labelNames: ['endpoint_type', 'status'],
  registers: [register],
});

console.log('✅ Rate limit metrics initialized');
