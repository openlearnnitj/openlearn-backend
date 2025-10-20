/**
 * HTTP Metrics
 * 
 * Prometheus metrics for HTTP requests and responses.
 * Tracks request duration, counts, sizes, and in-flight requests.
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { register, METRICS_CONFIG } from './index';

const prefix = METRICS_CONFIG.prefix;

/**
 * HTTP request duration histogram
 * Tracks how long requests take to complete
 * Labels: method, route, status_code
 */
export const httpRequestDuration = new Histogram({
  name: `${prefix}http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5], // Response time buckets
  registers: [register],
});

/**
 * HTTP request counter
 * Total number of HTTP requests
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
  name: `${prefix}http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * HTTP requests in flight gauge
 * Current number of requests being processed
 * Labels: method, route
 */
export const httpRequestsInFlight = new Gauge({
  name: `${prefix}http_requests_in_flight`,
  help: 'Current number of HTTP requests being processed',
  labelNames: ['method', 'route'],
  registers: [register],
});

/**
 * HTTP request size histogram
 * Size of HTTP request bodies in bytes
 * Labels: method, route
 */
export const httpRequestSizeBytes = new Histogram({
  name: `${prefix}http_request_size_bytes`,
  help: 'Size of HTTP request bodies in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000], // Size buckets
  registers: [register],
});

/**
 * HTTP response size histogram
 * Size of HTTP response bodies in bytes
 * Labels: method, route, status_code
 */
export const httpResponseSizeBytes = new Histogram({
  name: `${prefix}http_response_size_bytes`,
  help: 'Size of HTTP response bodies in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000], // Size buckets
  registers: [register],
});

/**
 * HTTP errors counter
 * Total number of HTTP errors (status >= 400)
 * Labels: method, route, status_code, error_type
 */
export const httpErrorsTotal = new Counter({
  name: `${prefix}http_errors_total`,
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'], // error_type: client_error (4xx), server_error (5xx)
  registers: [register],
});

console.log('✅ HTTP metrics initialized');
