import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ErrorCodes, createApiError } from '../utils/common';
import { prisma } from '../config/database';

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
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createApiError(
        'Authentication required',
        401,
        ErrorCodes.AUTHENTICATION_REQUIRED
      ));
    }

    const userRoles = req.user.roles.map(role => role.name);
    const hasRequiredRole = allowedRoles.some(role => 
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return next(createApiError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      ));
    }

    next();
  };
};

/**
 * Middleware factory to check if user has required permissions
 * 
 * @param requiredPermissions - Array of permission names required
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission.
 * @returns Express middleware function
 * 
 * Usage: requirePermissions(['READ_BLOG', 'WRITE_BLOG'], false)
 */
export const requirePermissions = (
  requiredPermissions: string[], 
  requireAll: boolean = true
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createApiError(
        'Authentication required',
        401,
        ErrorCodes.AUTHENTICATION_REQUIRED
      ));
    }

    const userPermissions = req.user.permissions.map(p => p.name);
    
    let hasAccess: boolean;
    
    if (requireAll) {
      // User must have ALL required permissions
      hasAccess = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
    } else {
      // User needs ANY of the required permissions
      hasAccess = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );
    }

    if (!hasAccess) {
      return next(createApiError(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      ));
    }

    next();
  };
};

/**
 * Middleware to check if user can access their own resource or has admin privileges
 * 
 * @param userIdParam - Name of the route parameter containing the user ID (default: 'userId')
 * @returns Express middleware function
 * 
 * Usage: requireOwnershipOrAdmin('userId') for routes like /users/:userId
 */
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createApiError(
        'Authentication required',
        401,
        ErrorCodes.AUTHENTICATION_REQUIRED
      ));
    }

    const targetUserId = req.params[userIdParam];
    const currentUserId = req.user.id;
    const userRoles = req.user.roles.map(role => role.name);
    
    // Check if user is accessing their own resource
    const isOwner = targetUserId === currentUserId;
    
    // Check if user has admin privileges (Pathfinder or higher)
    const hasAdminRole = userRoles.some(role => 
      ['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER', 'ADMIN'].includes(role)
    );

    if (!isOwner && !hasAdminRole) {
      return next(createApiError(
        'Access denied. You can only access your own resources or need admin privileges.',
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      ));
    }

    next();
  };
};

/**
 * Advanced middleware to check resource ownership for specific models
 * 
 * @param modelName - Prisma model name ('blogPost', 'project', etc.)
 * @param resourceIdParam - Route parameter name containing resource ID
 * @param userIdField - Field name in the model that contains the owner's user ID (default: 'authorId')
 * @returns Express middleware function
 */
export const requireResourceOwnership = (
  modelName: string,
  resourceIdParam: string,
  userIdField: string = 'authorId'
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(createApiError(
          'Authentication required',
          401,
          ErrorCodes.AUTHENTICATION_REQUIRED
        ));
      }

      const resourceId = req.params[resourceIdParam];
      const currentUserId = req.user.id;
      const userRoles = req.user.roles.map(role => role.name);

      // Check if user has admin privileges that bypass ownership checks
      const hasAdminRole = userRoles.some(role => 
        ['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER', 'ADMIN'].includes(role)
      );

      if (hasAdminRole) {
        return next(); // Admin can access any resource
      }

      // Query the resource to check ownership
      const resource = await (prisma as any)[modelName].findUnique({
        where: { id: resourceId },
        select: { [userIdField]: true }
      });

      if (!resource) {
        return next(createApiError(
          'Resource not found',
          404,
          ErrorCodes.RESOURCE_NOT_FOUND
        ));
      }

      if (resource[userIdField] !== currentUserId) {
        return next(createApiError(
          'Access denied. You can only access your own resources.',
          403,
          ErrorCodes.INSUFFICIENT_PERMISSIONS
        ));
      }

      next();

    } catch (error) {
      console.error('Resource ownership check error:', error);
      next(createApiError(
        'Authorization check failed',
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR
      ));
    }
  };
};

/**
 * Middleware to check hierarchical role permissions
 * Useful for organizational hierarchy (Pathfinder > Chief Pathfinder > Grand Pathfinder)
 * 
 * @param minimumRole - Minimum role level required
 * @returns Express middleware function
 */
export const requireMinimumRole = (minimumRole: string) => {
  // Define role hierarchy (lower index = higher privilege)
  const roleHierarchy = [
    'GRAND_PATHFINDER',
    'CHIEF_PATHFINDER', 
    'PATHFINDER',
    'LUMINARY',
    'PIONEER'
  ];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createApiError(
        'Authentication required',
        401,
        ErrorCodes.AUTHENTICATION_REQUIRED
      ));
    }

    const userRoles = req.user.roles.map(role => role.name);
    const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
    
    if (minimumRoleIndex === -1) {
      return next(createApiError(
        'Invalid role specified',
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR
      ));
    }

    // Check if user has any role with sufficient privileges
    const hasRequiredLevel = userRoles.some(role => {
      const userRoleIndex = roleHierarchy.indexOf(role);
      return userRoleIndex !== -1 && userRoleIndex <= minimumRoleIndex;
    });

    if (!hasRequiredLevel) {
      return next(createApiError(
        `Access denied. Minimum role required: ${minimumRole}`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      ));
    }

    next();
  };
};

/**
 * Convenience middleware combinations for common use cases
 */

// Pioneer-level access (students)
export const requirePioneer = requireRoles(['PIONEER', 'LUMINARY', 'PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);

// Pathfinder-level access (teachers/admins)
export const requirePathfinder = requireRoles(['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);

// High-level admin access
export const requireChiefPathfinder = requireRoles(['CHIEF_PATHFINDER', 'GRAND_PATHFINDER']);

// Top-level access
export const requireGrandPathfinder = requireRoles(['GRAND_PATHFINDER']);

/**
 * Permission-based middleware for common actions
 */

// Blog permissions
export const canReadBlogs = requirePermissions(['READ_BLOG'], false);
export const canWriteBlogs = requirePermissions(['WRITE_BLOG', 'MANAGE_BLOG'], false);
export const canManageBlogs = requirePermissions(['MANAGE_BLOG']);

// User management permissions
export const canManageUsers = requirePermissions(['MANAGE_USERS']);
export const canViewUsers = requirePermissions(['VIEW_USERS', 'MANAGE_USERS'], false);

// Project permissions
export const canSubmitProjects = requirePermissions(['SUBMIT_PROJECT']);
export const canReviewProjects = requirePermissions(['REVIEW_PROJECT', 'MANAGE_PROJECT'], false);
export const canManageProjects = requirePermissions(['MANAGE_PROJECT']);

// System permissions
export const canManageSystem = requirePermissions(['MANAGE_SYSTEM']);
export const canViewAuditLogs = requirePermissions(['VIEW_AUDIT_LOGS']);

/**
 * Middleware to add user context to audit logs
 * Should be used after authentication
 */
export const addAuditContext = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user) {
    // Add audit context to request for later use
    (req as any).auditContext = {
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
