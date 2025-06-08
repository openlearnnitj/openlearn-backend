/**
 * Middleware index file for OpenLearn backend
 * 
 * This module exports all middleware components for easy importing
 * and provides convenient middleware combinations for common use cases.
 */

// Import all middleware modules
import * as authMiddleware from './auth';
import * as authorizationMiddleware from './authorization';
import * as securityMiddleware from './security';
import * as validationMiddleware from './validation';
import * as errorMiddleware from './error';

// Re-export all individual middleware functions
export const authenticate = authMiddleware.authenticate;
export const optionalAuthenticate = authMiddleware.optionalAuthenticate;
export const authRateLimit = authMiddleware.authRateLimit;
export const requireEmailVerification = authMiddleware.requireEmailVerification;
export const requireActiveAccount = authMiddleware.requireActiveAccount;

export const requireRoles = authorizationMiddleware.requireRoles;
export const requirePermissions = authorizationMiddleware.requirePermissions;
export const requireOwnershipOrAdmin = authorizationMiddleware.requireOwnershipOrAdmin;
export const requireResourceOwnership = authorizationMiddleware.requireResourceOwnership;
export const requireMinimumRole = authorizationMiddleware.requireMinimumRole;
export const requirePioneer = authorizationMiddleware.requirePioneer;
export const requirePathfinder = authorizationMiddleware.requirePathfinder;
export const requireChiefPathfinder = authorizationMiddleware.requireChiefPathfinder;
export const requireGrandPathfinder = authorizationMiddleware.requireGrandPathfinder;
export const canReadBlogs = authorizationMiddleware.canReadBlogs;
export const canWriteBlogs = authorizationMiddleware.canWriteBlogs;
export const canManageBlogs = authorizationMiddleware.canManageBlogs;
export const canManageUsers = authorizationMiddleware.canManageUsers;
export const canSubmitProjects = authorizationMiddleware.canSubmitProjects;
export const canReviewProjects = authorizationMiddleware.canReviewProjects;
export const canManageSystem = authorizationMiddleware.canManageSystem;
export const addAuditContext = authorizationMiddleware.addAuditContext;

export const securityHeaders = securityMiddleware.securityHeaders;
export const generalRateLimit = securityMiddleware.generalRateLimit;
export const uploadRateLimit = securityMiddleware.uploadRateLimit;
export const securityLogger = securityMiddleware.securityLogger;
export const sanitizeInput = securityMiddleware.sanitizeInput;
export const validateApiKey = securityMiddleware.validateApiKey;
export const ipWhitelist = securityMiddleware.ipWhitelist;
export const createSizeLimitMiddleware = securityMiddleware.createSizeLimitMiddleware;
export const corsHandler = securityMiddleware.corsHandler;
export const requestLogger = securityMiddleware.requestLogger;

export const handleValidationErrors = validationMiddleware.handleValidationErrors;
export const commonValidations = validationMiddleware.commonValidations;
export const authValidations = validationMiddleware.authValidations;
export const userValidations = validationMiddleware.userValidations;
export const blogValidations = validationMiddleware.blogValidations;
export const projectValidations = validationMiddleware.projectValidations;
export const commentValidations = validationMiddleware.commentValidations;
export const adminValidations = validationMiddleware.adminValidations;
export const createCustomValidation = validationMiddleware.createCustomValidation;
export const sanitizeRequest = validationMiddleware.sanitizeRequest;

export const errorHandler = errorMiddleware.errorHandler;
export const notFoundHandler = errorMiddleware.notFoundHandler;
export const asyncHandler = errorMiddleware.asyncHandler;
export const setupGlobalErrorHandlers = errorMiddleware.setupGlobalErrorHandlers;

/**
 * Middleware combinations for common authentication patterns
 */

// Standard authentication chain for protected routes
export const protectedRoute = [
  authenticate,
  requireActiveAccount,
  addAuditContext
];

// Authentication chain with email verification requirement
export const verifiedRoute = [
  authenticate,
  requireActiveAccount,
  requireEmailVerification,
  addAuditContext
];

// Pioneer-level protected route (students)
export const pioneerRoute = [
  authenticate,
  requireActiveAccount,
  requirePioneer,
  addAuditContext
];

// Pathfinder-level protected route (teachers/admins)
export const pathfinderRoute = [
  authenticate,
  requireActiveAccount,
  requirePathfinder,
  addAuditContext
];

// Admin-level protected route (high-level admins)
export const adminRoute = [
  authenticate,
  requireActiveAccount,
  requireChiefPathfinder,
  addAuditContext
];

// Super admin route (highest level)
export const superAdminRoute = [
  authenticate,
  requireActiveAccount,
  requireGrandPathfinder,
  addAuditContext
];

/**
 * Middleware combinations for specific features
 */

// Blog management routes
export const blogOwnerRoute = [
  authenticate,
  requireActiveAccount,
  canWriteBlogs,
  addAuditContext
];

export const blogModeratorRoute = [
  authenticate,
  requireActiveAccount,
  canManageBlogs,
  addAuditContext
];

// User management routes
export const userManagerRoute = [
  authenticate,
  requireActiveAccount,
  canManageUsers,
  addAuditContext
];

// Project management routes
export const projectSubmitterRoute = [
  authenticate,
  requireActiveAccount,
  canSubmitProjects,
  addAuditContext
];

export const projectReviewerRoute = [
  authenticate,
  requireActiveAccount,
  canReviewProjects,
  addAuditContext
];

// System administration routes
export const systemAdminRoute = [
  authenticate,
  requireActiveAccount,
  canManageSystem,
  addAuditContext
];

/**
 * Security middleware stack for all routes
 */
export const baseSecurityStack = [
  securityHeaders,
  securityLogger,
  sanitizeInput,
  generalRateLimit
];

/**
 * Authentication endpoint security stack
 */
export const authSecurityStack = [
  securityHeaders,
  securityLogger,
  sanitizeInput,
  authRateLimit,
  sanitizeRequest
];

/**
 * File upload security stack
 */
export const uploadSecurityStack = [
  securityHeaders,
  securityLogger,
  sanitizeInput,
  uploadRateLimit,
  createSizeLimitMiddleware('10mb')
];

/**
 * API documentation and health check routes (minimal security)
 */
export const publicRoute = [
  securityHeaders,
  generalRateLimit
];

/**
 * Webhook and integration routes
 */
export const webhookRoute = [
  securityHeaders,
  validateApiKey,
  generalRateLimit,
  addAuditContext
];

/**
 * Optional authentication routes (work for both authenticated and anonymous users)
 */
export const optionalAuthRoute = [
  securityHeaders,
  securityLogger,
  sanitizeInput,
  optionalAuthenticate,
  addAuditContext
];

/**
 * Development-only routes with relaxed security
 */
export const devRoute = process.env.NODE_ENV === 'development' ? [
  securityHeaders,
  sanitizeInput
] : [
  // In production, treat dev routes as admin routes
  authenticate,
  requireActiveAccount,
  requireGrandPathfinder,
  addAuditContext
];

/**
 * Utility function to create resource ownership middleware
 * @param modelName - Prisma model name
 * @param resourceIdParam - Route parameter name for resource ID
 * @param userIdField - Field name in model that contains owner ID
 */
export const createResourceOwnershipRoute = (
  modelName: string,
  resourceIdParam: string = 'id',
  userIdField: string = 'authorId'
) => [
  authenticate,
  requireActiveAccount,
  requireResourceOwnership(modelName, resourceIdParam, userIdField),
  addAuditContext
];

/**
 * Utility function to create permission-based route
 * @param permissions - Required permissions
 * @param requireAll - Whether user needs all permissions (default) or just one
 */
export const createPermissionRoute = (
  permissions: string[],
  requireAll: boolean = true
) => [
  authenticate,
  requireActiveAccount,
  requirePermissions(permissions, requireAll),
  addAuditContext
];

/**
 * Utility function to create role-based route
 * @param roles - Required roles
 */
export const createRoleRoute = (roles: string[]) => [
  authenticate,
  requireActiveAccount,
  requireRoles(roles),
  addAuditContext
];

/**
 * Export middleware types for TypeScript support
 */
export * from '../types';

/**
 * Middleware configuration object for easy setup
 */
export const middlewareConfig = {
  // Base middleware for all routes
  base: baseSecurityStack,
  
  // Authentication routes
  auth: authSecurityStack,
  
  // Protected routes by access level
  public: publicRoute,
  protected: protectedRoute,
  verified: verifiedRoute,
  pioneer: pioneerRoute,
  pathfinder: pathfinderRoute,
  admin: adminRoute,
  superAdmin: superAdminRoute,
  
  // Feature-specific routes
  blog: {
    owner: blogOwnerRoute,
    moderator: blogModeratorRoute
  },
  
  user: {
    manager: userManagerRoute
  },
  
  project: {
    submitter: projectSubmitterRoute,
    reviewer: projectReviewerRoute
  },
  
  system: {
    admin: systemAdminRoute
  },
  
  // Special purpose routes
  upload: uploadSecurityStack,
  webhook: webhookRoute,
  optional: optionalAuthRoute,
  dev: devRoute
};

/**
 * Default export for convenience
 */
export default middlewareConfig;
