"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuditContext = exports.canViewAuditLogs = exports.canManageSystem = exports.canManageProjects = exports.canReviewProjects = exports.canSubmitProjects = exports.canViewUsers = exports.canManageUsers = exports.canManageBlogs = exports.canWriteBlogs = exports.canReadBlogs = exports.requireGrandPathfinder = exports.requireChiefPathfinder = exports.requirePathfinder = exports.requirePioneer = exports.requireMinimumRole = exports.requireResourceOwnership = exports.requireOwnershipOrAdmin = exports.requirePermissions = exports.requireRoles = void 0;
const common_1 = require("../utils/common");
const database_1 = require("../config/database");
/**
 * Authorization middleware for Role-Based Access Control (RBAC)
 *
 * This module provides granular authorization controls for the OpenLearn platform:
 * - Role-based access (Pioneer, Pathfinder, etc.)
 * - Permission-based access (READ_BLOG, WRITE_BLOG, etc.)
 * - Resource ownership checks
 * - Hierarchical role checks
 */
/**
 * Middleware factory to check if user has required roles
 *
 * @param allowedRoles - Array of role names that are allowed access
 * @returns Express middleware function
 *
 * Usage: requireRoles(['PATHFINDER', 'ADMIN'])
 */
const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
        }
        const userRoles = req.user.roles.map(role => role.name);
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            return next((0, common_1.createApiError)(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403, common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS));
        }
        next();
    };
};
exports.requireRoles = requireRoles;
/**
 * Middleware factory to check if user has required permissions
 *
 * @param requiredPermissions - Array of permission names required
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission.
 * @returns Express middleware function
 *
 * Usage: requirePermissions(['READ_BLOG', 'WRITE_BLOG'], false)
 */
const requirePermissions = (requiredPermissions, requireAll = true) => {
    return (req, res, next) => {
        if (!req.user) {
            return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
        }
        const userPermissions = req.user.permissions.map(p => p.name);
        let hasAccess;
        if (requireAll) {
            // User must have ALL required permissions
            hasAccess = requiredPermissions.every(permission => userPermissions.includes(permission));
        }
        else {
            // User needs ANY of the required permissions
            hasAccess = requiredPermissions.some(permission => userPermissions.includes(permission));
        }
        if (!hasAccess) {
            return next((0, common_1.createApiError)(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`, 403, common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS));
        }
        next();
    };
};
exports.requirePermissions = requirePermissions;
/**
 * Middleware to check if user can access their own resource or has admin privileges
 *
 * @param userIdParam - Name of the route parameter containing the user ID (default: 'userId')
 * @returns Express middleware function
 *
 * Usage: requireOwnershipOrAdmin('userId') for routes like /users/:userId
 */
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
        }
        const targetUserId = req.params[userIdParam];
        const currentUserId = req.user.id;
        const userRoles = req.user.roles.map(role => role.name);
        // Check if user is accessing their own resource
        const isOwner = targetUserId === currentUserId;
        // Check if user has admin privileges (Pathfinder or higher)
        const hasAdminRole = userRoles.some(role => ['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER', 'ADMIN'].includes(role));
        if (!isOwner && !hasAdminRole) {
            return next((0, common_1.createApiError)('Access denied. You can only access your own resources or need admin privileges.', 403, common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS));
        }
        next();
    };
};
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
/**
 * Advanced middleware to check resource ownership for specific models
 *
 * @param modelName - Prisma model name ('blogPost', 'project', etc.)
 * @param resourceIdParam - Route parameter name containing resource ID
 * @param userIdField - Field name in the model that contains the owner's user ID (default: 'authorId')
 * @returns Express middleware function
 */
const requireResourceOwnership = (modelName, resourceIdParam, userIdField = 'authorId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
            }
            const resourceId = req.params[resourceIdParam];
            const currentUserId = req.user.id;
            const userRoles = req.user.roles.map(role => role.name);
            // Check if user has admin privileges that bypass ownership checks
            const hasAdminRole = userRoles.some(role => ['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER', 'ADMIN'].includes(role));
            if (hasAdminRole) {
                return next(); // Admin can access any resource
            }
            // Query the resource to check ownership
            const resource = await database_1.prisma[modelName].findUnique({
                where: { id: resourceId },
                select: { [userIdField]: true }
            });
            if (!resource) {
                return next((0, common_1.createApiError)('Resource not found', 404, common_1.ErrorCodes.RESOURCE_NOT_FOUND));
            }
            if (resource[userIdField] !== currentUserId) {
                return next((0, common_1.createApiError)('Access denied. You can only access your own resources.', 403, common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS));
            }
            next();
        }
        catch (error) {
            console.error('Resource ownership check error:', error);
            next((0, common_1.createApiError)('Authorization check failed', 500, common_1.ErrorCodes.INTERNAL_SERVER_ERROR));
        }
    };
};
exports.requireResourceOwnership = requireResourceOwnership;
/**
 * Middleware to check hierarchical role permissions
 * Useful for organizational hierarchy (Pathfinder > Chief Pathfinder > Grand Pathfinder)
 *
 * @param minimumRole - Minimum role level required
 * @returns Express middleware function
 */
const requireMinimumRole = (minimumRole) => {
    // Define role hierarchy (lower index = higher privilege)
    const roleHierarchy = [
        'GRAND_PATHFINDER',
        'CHIEF_PATHFINDER',
        'PATHFINDER',
        'LUMINARY',
        'PIONEER'
    ];
    return (req, res, next) => {
        if (!req.user) {
            return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
        }
        const userRoles = req.user.roles.map(role => role.name);
        const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
        if (minimumRoleIndex === -1) {
            return next((0, common_1.createApiError)('Invalid role specified', 500, common_1.ErrorCodes.INTERNAL_SERVER_ERROR));
        }
        // Check if user has any role with sufficient privileges
        const hasRequiredLevel = userRoles.some(role => {
            const userRoleIndex = roleHierarchy.indexOf(role);
            return userRoleIndex !== -1 && userRoleIndex <= minimumRoleIndex;
        });
        if (!hasRequiredLevel) {
            return next((0, common_1.createApiError)(`Access denied. Minimum role required: ${minimumRole}`, 403, common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS));
        }
        next();
    };
};
exports.requireMinimumRole = requireMinimumRole;
/**
 * Convenience middleware combinations for common use cases
 */
// Pioneer-level access (students)
exports.requirePioneer = (0, exports.requireRoles)(['PIONEER', 'LUMINARY', 'PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);
// Pathfinder-level access (teachers/admins)
exports.requirePathfinder = (0, exports.requireRoles)(['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);
// High-level admin access
exports.requireChiefPathfinder = (0, exports.requireRoles)(['CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);
// Top-level access
exports.requireGrandPathfinder = (0, exports.requireRoles)(['GRAND_PATHFINDER']);
/**
 * Permission-based middleware for common actions
 */
// Blog permissions
exports.canReadBlogs = (0, exports.requirePermissions)(['READ_BLOG'], false);
exports.canWriteBlogs = (0, exports.requirePermissions)(['WRITE_BLOG', 'MANAGE_BLOG'], false);
exports.canManageBlogs = (0, exports.requirePermissions)(['MANAGE_BLOG']);
// User management permissions
exports.canManageUsers = (0, exports.requirePermissions)(['MANAGE_USERS']);
exports.canViewUsers = (0, exports.requirePermissions)(['VIEW_USERS', 'MANAGE_USERS'], false);
// Project permissions
exports.canSubmitProjects = (0, exports.requirePermissions)(['SUBMIT_PROJECT']);
exports.canReviewProjects = (0, exports.requirePermissions)(['REVIEW_PROJECT', 'MANAGE_PROJECT'], false);
exports.canManageProjects = (0, exports.requirePermissions)(['MANAGE_PROJECT']);
// System permissions
exports.canManageSystem = (0, exports.requirePermissions)(['MANAGE_SYSTEM']);
exports.canViewAuditLogs = (0, exports.requirePermissions)(['VIEW_AUDIT_LOGS']);
/**
 * Middleware to add user context to audit logs
 * Should be used after authentication
 */
const addAuditContext = (req, res, next) => {
    if (req.user) {
        // Add audit context to request for later use
        req.auditContext = {
            userId: req.user.id,
            userEmail: req.user.email,
            userRoles: req.user.roles,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date()
        };
    }
    next();
};
exports.addAuditContext = addAuditContext;
