/**
 * Database Metrics
 * 
 * Prometheus metrics for database operations.
 * Tracks query duration, connection pool, errors, and operations.
 */

import { Counter, Histogram, Gauge } from 'prom-client';
import { register, METRICS_CONFIG } from './index';

const prefix = METRICS_CONFIG.prefix;

/**
 * Database query duration histogram
 * Tracks how long database queries take
 * Labels: operation (findMany, findUnique, create, update, delete, etc.), model (User, Cohort, etc.)
 */
export const dbQueryDuration = new Histogram({
  name: `${prefix}db_query_duration_seconds`,
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Query time buckets
  registers: [register],
});

/**
 * Database queries counter
 * Total number of database queries
 * Labels: operation, model, status (success/error)
 */
export const dbQueriesTotal = new Counter({
  name: `${prefix}db_queries_total`,
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

/**
 * Database connection pool metrics
 * Current number of active/idle connections
 */
export const dbConnectionsActive = new Gauge({
  name: `${prefix}db_connections_active`,
  help: 'Number of active database connections',
  registers: [register],
});

export const dbConnectionsIdle = new Gauge({
  name: `${prefix}db_connections_idle`,
  help: 'Number of idle database connections',
  registers: [register],
});

/**
 * Database errors counter
 * Total number of database errors
 * Labels: operation, model, error_code
 */
export const dbErrorsTotal = new Counter({
  name: `${prefix}db_errors_total`,
  help: 'Total number of database errors',
  labelNames: ['operation', 'model', 'error_code'],
  registers: [register],
});

/**
 * Database transaction duration
 * Tracks interactive transaction duration
 * Labels: status (committed/rolled_back)
 */
export const dbTransactionDuration = new Histogram({
  name: `${prefix}db_transaction_duration_seconds`,
  help: 'Duration of database transactions in seconds',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Transaction time buckets
  registers: [register],
});

console.log('✅ Database metrics initialized');
