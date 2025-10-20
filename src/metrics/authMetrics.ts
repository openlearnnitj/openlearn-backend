/**
 * Authentication Metrics
 * 
 * Prometheus metrics for authentication and authorization operations.
 * Tracks logins, token validations, JWT errors, and user activity.
 */

import { Counter, Gauge } from 'prom-client';
import { register, METRICS_CONFIG } from './index';

const prefix = METRICS_CONFIG.prefix;

/**
 * Login attempts counter
 * Total number of login attempts
 * Labels: status (success/failure), reason (invalid_password, user_not_found, suspended, etc.)
 */
export const authLoginAttemptsTotal = new Counter({
  name: `${prefix}auth_login_attempts_total`,
  help: 'Total number of login attempts',
  labelNames: ['status', 'reason'],
  registers: [register],
});

/**
 * Token validations counter
 * Total number of JWT token validations
 * Labels: result (valid/invalid/expired/missing)
 */
export const authTokenValidationsTotal = new Counter({
  name: `${prefix}auth_token_validations_total`,
  help: 'Total number of token validations',
  labelNames: ['result'],
  registers: [register],
});

/**
 * JWT errors counter
 * Total number of JWT-related errors
 * Labels: type (expired, malformed, invalid_signature, etc.)
 */
export const authJwtErrorsTotal = new Counter({
  name: `${prefix}auth_jwt_errors_total`,
  help: 'Total number of JWT errors',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Active users gauge
 * Current number of active authenticated users (tracked by unique user IDs in last 15 minutes)
 * Labels: role (PIONEER, PATHFINDER, etc.)
 */
export const authActiveUsers = new Gauge({
  name: `${prefix}auth_active_users`,
  help: 'Number of active authenticated users by role',
  labelNames: ['role'],
  registers: [register],
});

/**
 * Password reset requests counter
 * Total number of password reset requests
 * Labels: status (success/failure)
 */
export const authPasswordResetRequestsTotal = new Counter({
  name: `${prefix}auth_password_reset_requests_total`,
  help: 'Total number of password reset requests',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Registration attempts counter
 * Total number of user registration attempts
 * Labels: status (success/failure), reason (email_exists, validation_failed, etc.)
 */
export const authRegistrationAttemptsTotal = new Counter({
  name: `${prefix}auth_registration_attempts_total`,
  help: 'Total number of registration attempts',
  labelNames: ['status', 'reason'],
  registers: [register],
});

/**
 * Authorization failures counter
 * Total number of authorization failures (user tried to access resource without permission)
 * Labels: required_role, user_role, endpoint
 */
export const authAuthorizationFailuresTotal = new Counter({
  name: `${prefix}auth_authorization_failures_total`,
  help: 'Total number of authorization failures',
  labelNames: ['required_role', 'user_role', 'endpoint'],
  registers: [register],
});

console.log('✅ Authentication metrics initialized');
