"use strict";
/**
 * Middleware index file for OpenLearn backend
 *
 * This module exports all middleware components for easy importing
 * and provides convenient middleware combinations for common use cases.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = exports.createCustomValidation = exports.adminValidations = exports.commentValidations = exports.projectValidations = exports.blogValidations = exports.userValidations = exports.authValidations = exports.commonValidations = exports.handleValidationErrors = exports.securityMiddleware = exports.createSizeLimitMiddleware = exports.validateApiKey = exports.ipWhitelist = exports.securityLogger = exports.securityHeaders = exports.sanitizeInput = exports.speedLimiter = exports.expensiveOperationLimit = exports.uploadRateLimit = exports.apiRateLimit = exports.passwordResetRateLimit = exports.generalRateLimit = exports.helmetConfig = exports.corsOptions = exports.addAuditContext = exports.canViewAuditLogs = exports.canManageSystem = exports.canManageProjects = exports.canReviewProjects = exports.canSubmitProjects = exports.canViewUsers = exports.canManageUsers = exports.canManageBlogs = exports.canWriteBlogs = exports.canReadBlogs = exports.requireGrandPathfinder = exports.requireChiefPathfinder = exports.requirePathfinder = exports.requirePioneer = exports.requireMinimumRole = exports.requireResourceOwnership = exports.requireOwnershipOrAdmin = exports.requirePermissions = exports.requireRoles = exports.requireActiveAccount = exports.requireEmailVerification = exports.authRateLimit = exports.optionalAuthenticate = exports.authenticate = void 0;
exports.middlewareConfig = exports.createRoleRoute = exports.createPermissionRoute = exports.createResourceOwnershipRoute = exports.devRoute = exports.optionalAuthRoute = exports.webhookRoute = exports.publicRoute = exports.uploadSecurityStack = exports.authSecurityStack = exports.baseSecurityStack = exports.systemAdminRoute = exports.projectReviewerRoute = exports.projectSubmitterRoute = exports.userManagerRoute = exports.blogModeratorRoute = exports.blogOwnerRoute = exports.superAdminRoute = exports.adminRoute = exports.pathfinderRoute = exports.pioneerRoute = exports.verifiedRoute = exports.protectedRoute = exports.setupGlobalErrorHandlers = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
// Authentication middleware
var auth_1 = require("./auth");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return auth_1.authenticate; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return auth_1.optionalAuthenticate; } });
Object.defineProperty(exports, "authRateLimit", { enumerable: true, get: function () { return auth_1.authRateLimit; } });
Object.defineProperty(exports, "requireEmailVerification", { enumerable: true, get: function () { return auth_1.requireEmailVerification; } });
Object.defineProperty(exports, "requireActiveAccount", { enumerable: true, get: function () { return auth_1.requireActiveAccount; } });
// Authorization middleware
var authorization_1 = require("./authorization");
Object.defineProperty(exports, "requireRoles", { enumerable: true, get: function () { return authorization_1.requireRoles; } });
Object.defineProperty(exports, "requirePermissions", { enumerable: true, get: function () { return authorization_1.requirePermissions; } });
Object.defineProperty(exports, "requireOwnershipOrAdmin", { enumerable: true, get: function () { return authorization_1.requireOwnershipOrAdmin; } });
Object.defineProperty(exports, "requireResourceOwnership", { enumerable: true, get: function () { return authorization_1.requireResourceOwnership; } });
Object.defineProperty(exports, "requireMinimumRole", { enumerable: true, get: function () { return authorization_1.requireMinimumRole; } });
Object.defineProperty(exports, "requirePioneer", { enumerable: true, get: function () { return authorization_1.requirePioneer; } });
Object.defineProperty(exports, "requirePathfinder", { enumerable: true, get: function () { return authorization_1.requirePathfinder; } });
Object.defineProperty(exports, "requireChiefPathfinder", { enumerable: true, get: function () { return authorization_1.requireChiefPathfinder; } });
Object.defineProperty(exports, "requireGrandPathfinder", { enumerable: true, get: function () { return authorization_1.requireGrandPathfinder; } });
Object.defineProperty(exports, "canReadBlogs", { enumerable: true, get: function () { return authorization_1.canReadBlogs; } });
Object.defineProperty(exports, "canWriteBlogs", { enumerable: true, get: function () { return authorization_1.canWriteBlogs; } });
Object.defineProperty(exports, "canManageBlogs", { enumerable: true, get: function () { return authorization_1.canManageBlogs; } });
Object.defineProperty(exports, "canManageUsers", { enumerable: true, get: function () { return authorization_1.canManageUsers; } });
Object.defineProperty(exports, "canViewUsers", { enumerable: true, get: function () { return authorization_1.canViewUsers; } });
Object.defineProperty(exports, "canSubmitProjects", { enumerable: true, get: function () { return authorization_1.canSubmitProjects; } });
Object.defineProperty(exports, "canReviewProjects", { enumerable: true, get: function () { return authorization_1.canReviewProjects; } });
Object.defineProperty(exports, "canManageProjects", { enumerable: true, get: function () { return authorization_1.canManageProjects; } });
Object.defineProperty(exports, "canManageSystem", { enumerable: true, get: function () { return authorization_1.canManageSystem; } });
Object.defineProperty(exports, "canViewAuditLogs", { enumerable: true, get: function () { return authorization_1.canViewAuditLogs; } });
Object.defineProperty(exports, "addAuditContext", { enumerable: true, get: function () { return authorization_1.addAuditContext; } });
// Security middleware
var security_1 = require("./security");
Object.defineProperty(exports, "corsOptions", { enumerable: true, get: function () { return security_1.corsOptions; } });
Object.defineProperty(exports, "helmetConfig", { enumerable: true, get: function () { return security_1.helmetConfig; } });
Object.defineProperty(exports, "generalRateLimit", { enumerable: true, get: function () { return security_1.generalRateLimit; } });
Object.defineProperty(exports, "passwordResetRateLimit", { enumerable: true, get: function () { return security_1.passwordResetRateLimit; } });
Object.defineProperty(exports, "apiRateLimit", { enumerable: true, get: function () { return security_1.apiRateLimit; } });
Object.defineProperty(exports, "uploadRateLimit", { enumerable: true, get: function () { return security_1.uploadRateLimit; } });
Object.defineProperty(exports, "expensiveOperationLimit", { enumerable: true, get: function () { return security_1.expensiveOperationLimit; } });
Object.defineProperty(exports, "speedLimiter", { enumerable: true, get: function () { return security_1.speedLimiter; } });
Object.defineProperty(exports, "sanitizeInput", { enumerable: true, get: function () { return security_1.sanitizeInput; } });
Object.defineProperty(exports, "securityHeaders", { enumerable: true, get: function () { return security_1.securityHeaders; } });
Object.defineProperty(exports, "securityLogger", { enumerable: true, get: function () { return security_1.securityLogger; } });
Object.defineProperty(exports, "ipWhitelist", { enumerable: true, get: function () { return security_1.ipWhitelist; } });
Object.defineProperty(exports, "validateApiKey", { enumerable: true, get: function () { return security_1.validateApiKey; } });
Object.defineProperty(exports, "createSizeLimitMiddleware", { enumerable: true, get: function () { return security_1.createSizeLimitMiddleware; } });
Object.defineProperty(exports, "securityMiddleware", { enumerable: true, get: function () { return security_1.securityMiddleware; } });
// Validation middleware
var validation_1 = require("./validation");
Object.defineProperty(exports, "handleValidationErrors", { enumerable: true, get: function () { return validation_1.handleValidationErrors; } });
Object.defineProperty(exports, "commonValidations", { enumerable: true, get: function () { return validation_1.commonValidations; } });
Object.defineProperty(exports, "authValidations", { enumerable: true, get: function () { return validation_1.authValidations; } });
Object.defineProperty(exports, "userValidations", { enumerable: true, get: function () { return validation_1.userValidations; } });
Object.defineProperty(exports, "blogValidations", { enumerable: true, get: function () { return validation_1.blogValidations; } });
Object.defineProperty(exports, "projectValidations", { enumerable: true, get: function () { return validation_1.projectValidations; } });
Object.defineProperty(exports, "commentValidations", { enumerable: true, get: function () { return validation_1.commentValidations; } });
Object.defineProperty(exports, "adminValidations", { enumerable: true, get: function () { return validation_1.adminValidations; } });
Object.defineProperty(exports, "createCustomValidation", { enumerable: true, get: function () { return validation_1.createCustomValidation; } });
Object.defineProperty(exports, "sanitizeRequest", { enumerable: true, get: function () { return validation_1.sanitizeRequest; } });
// Error handling middleware
var error_1 = require("./error");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_1.errorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return error_1.notFoundHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return error_1.asyncHandler; } });
Object.defineProperty(exports, "setupGlobalErrorHandlers", { enumerable: true, get: function () { return error_1.setupGlobalErrorHandlers; } });
/**
 * Middleware combinations for common authentication patterns
 */
// Standard authentication chain for protected routes
exports.protectedRoute = [
    authenticate,
    requireActiveAccount,
    addAuditContext
];
// Authentication chain with email verification requirement
exports.verifiedRoute = [
    authenticate,
    requireActiveAccount,
    requireEmailVerification,
    addAuditContext
];
// Pioneer-level protected route (students)
exports.pioneerRoute = [
    authenticate,
    requireActiveAccount,
    requirePioneer,
    addAuditContext
];
// Pathfinder-level protected route (teachers/admins)
exports.pathfinderRoute = [
    authenticate,
    requireActiveAccount,
    requirePathfinder,
    addAuditContext
];
// Admin-level protected route (high-level admins)
exports.adminRoute = [
    authenticate,
    requireActiveAccount,
    requireChiefPathfinder,
    addAuditContext
];
// Super admin route (highest level)
exports.superAdminRoute = [
    authenticate,
    requireActiveAccount,
    requireGrandPathfinder,
    addAuditContext
];
/**
 * Middleware combinations for specific features
 */
// Blog management routes
exports.blogOwnerRoute = [
    authenticate,
    requireActiveAccount,
    canWriteBlogs,
    addAuditContext
];
exports.blogModeratorRoute = [
    authenticate,
    requireActiveAccount,
    canManageBlogs,
    addAuditContext
];
// User management routes
exports.userManagerRoute = [
    authenticate,
    requireActiveAccount,
    canManageUsers,
    addAuditContext
];
// Project management routes
exports.projectSubmitterRoute = [
    authenticate,
    requireActiveAccount,
    canSubmitProjects,
    addAuditContext
];
exports.projectReviewerRoute = [
    authenticate,
    requireActiveAccount,
    canReviewProjects,
    addAuditContext
];
// System administration routes
exports.systemAdminRoute = [
    authenticate,
    requireActiveAccount,
    canManageSystem,
    addAuditContext
];
/**
 * Security middleware stack for all routes
 */
exports.baseSecurityStack = [
    securityHeaders,
    securityLogger,
    sanitizeInput,
    generalRateLimit
];
/**
 * Authentication endpoint security stack
 */
exports.authSecurityStack = [
    securityHeaders,
    securityLogger,
    sanitizeInput,
    authRateLimit,
    sanitizeRequest
];
/**
 * File upload security stack
 */
exports.uploadSecurityStack = [
    securityHeaders,
    securityLogger,
    sanitizeInput,
    uploadRateLimit,
    createSizeLimitMiddleware('10mb')
];
/**
 * API documentation and health check routes (minimal security)
 */
exports.publicRoute = [
    securityHeaders,
    generalRateLimit
];
/**
 * Webhook and integration routes
 */
exports.webhookRoute = [
    securityHeaders,
    validateApiKey,
    generalRateLimit,
    addAuditContext
];
/**
 * Optional authentication routes (work for both authenticated and anonymous users)
 */
exports.optionalAuthRoute = [
    securityHeaders,
    securityLogger,
    sanitizeInput,
    optionalAuthenticate,
    addAuditContext
];
/**
 * Development-only routes with relaxed security
 */
exports.devRoute = process.env.NODE_ENV === 'development' ? [
    securityHeaders,
    sanitizeInput
] : [
    // In production, treat dev routes as admin routes
    ...exports.superAdminRoute
];
/**
 * Utility function to create resource ownership middleware
 * @param modelName - Prisma model name
 * @param resourceIdParam - Route parameter name for resource ID
 * @param userIdField - Field name in model that contains owner ID
 */
const createResourceOwnershipRoute = (modelName, resourceIdParam = 'id', userIdField = 'authorId') => [
    authenticate,
    requireActiveAccount,
    requireResourceOwnership(modelName, resourceIdParam, userIdField),
    addAuditContext
];
exports.createResourceOwnershipRoute = createResourceOwnershipRoute;
/**
 * Utility function to create permission-based route
 * @param permissions - Required permissions
 * @param requireAll - Whether user needs all permissions (default) or just one
 */
const createPermissionRoute = (permissions, requireAll = true) => [
    authenticate,
    requireActiveAccount,
    requirePermissions(permissions, requireAll),
    addAuditContext
];
exports.createPermissionRoute = createPermissionRoute;
/**
 * Utility function to create role-based route
 * @param roles - Required roles
 */
const createRoleRoute = (roles) => [
    authenticate,
    requireActiveAccount,
    requireRoles(roles),
    addAuditContext
];
exports.createRoleRoute = createRoleRoute;
/**
 * Export middleware types for TypeScript support
 */
__exportStar(require("../types"), exports);
/**
 * Middleware configuration object for easy setup
 */
exports.middlewareConfig = {
    // Base middleware for all routes
    base: exports.baseSecurityStack,
    // Authentication routes
    auth: exports.authSecurityStack,
    // Protected routes by access level
    public: exports.publicRoute,
    protected: exports.protectedRoute,
    verified: exports.verifiedRoute,
    pioneer: exports.pioneerRoute,
    pathfinder: exports.pathfinderRoute,
    admin: exports.adminRoute,
    superAdmin: exports.superAdminRoute,
    // Feature-specific routes
    blog: {
        owner: exports.blogOwnerRoute,
        moderator: exports.blogModeratorRoute
    },
    user: {
        manager: exports.userManagerRoute
    },
    project: {
        submitter: exports.projectSubmitterRoute,
        reviewer: exports.projectReviewerRoute
    },
    system: {
        admin: exports.systemAdminRoute
    },
    // Special purpose routes
    upload: exports.uploadSecurityStack,
    webhook: exports.webhookRoute,
    optional: exports.optionalAuthRoute,
    dev: exports.devRoute
};
/**
 * Default export for convenience
 */
exports.default = exports.middlewareConfig;
