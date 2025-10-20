/**
 * Prometheus Metrics Registry
 * 
 * Central registry for all application metrics exported to Prometheus.
 * This module initializes the registry and enables default Node.js metrics.
 */

import { Registry, collectDefaultMetrics } from 'prom-client';
import config from '../config/environment';

// Create a custom registry
export const register = new Registry();

// Configuration
const METRICS_CONFIG = {
  enabled: process.env.METRICS_ENABLED !== 'false', // Enabled by default
  collectDefault: process.env.METRICS_COLLECT_DEFAULT !== 'false', // Collect Node.js metrics by default
  prefix: process.env.METRICS_PREFIX || 'openlearn_', // Namespace for all metrics
  defaultInterval: 5000, // Collect default metrics every 5 seconds
};

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'openlearn-backend',
  environment: config.nodeEnv,
  version: process.env.npm_package_version || '1.0.0',
});

// Collect default Node.js metrics (heap, CPU, event loop, etc.)
if (METRICS_CONFIG.enabled && METRICS_CONFIG.collectDefault) {
  collectDefaultMetrics({
    register,
    prefix: METRICS_CONFIG.prefix,
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets in seconds
    eventLoopMonitoringPrecision: 10, // Event loop monitoring precision in ms
  });
  
  console.log('✅ Prometheus default metrics collection enabled');
}

export { METRICS_CONFIG };
