/**
 * Enhanced Authorization Middleware with Role Hierarchy
 * Implements GRAND_PATHFINDER god-mode and proper role hierarchy
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Role hierarchy mapping - higher roles include all lower role permissions
 * GRAND_PATHFINDER has god-mode access to everything
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  GRAND_PATHFINDER: ['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER', 'LUMINARY', 'PIONEER'],
  CHIEF_PATHFINDER: ['CHIEF_PATHFINDER', 'PATHFINDER', 'LUMINARY', 'PIONEER'],
  PATHFINDER: ['PATHFINDER', 'LUMINARY', 'PIONEER'],
  LUMINARY: ['LUMINARY', 'PIONEER'],
  PIONEER: ['PIONEER']
};

/**
 * Check if user has required role based on hierarchy
 */
function hasRolePermission(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  const userPermissions = ROLE_HIERARCHY[userRole];
  return allowedRoles.some(role => userPermissions.includes(role));
}

/**
 * Basic role-based authorization with hierarchy support
 * GRAND_PATHFINDER bypasses all role checks (god mode)
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // GRAND_PATHFINDER god mode - bypass all checks
    if (req.user.role === UserRole.GRAND_PATHFINDER) {
      next();
      return;
    }

    // Check role hierarchy
    if (!hasRolePermission(req.user.role, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * League-specific authorization
 * Checks if user has access to specific league
 * GRAND_PATHFINDER and CHIEF_PATHFINDER bypass league checks
 */
export const authorizeForLeague = (leagueIdParam: string = 'leagueId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Only GRAND_PATHFINDER has god mode
    if (req.user.role === UserRole.GRAND_PATHFINDER) {
      next();
      return;
    }

    // For CHIEF_PATHFINDER, PATHFINDER, and below, check league-specific access
    const leagueId = req.params[leagueIdParam] || req.body[leagueIdParam] || req.query[leagueIdParam];
    
    if (!leagueId) {
      res.status(400).json({
        success: false,
        error: 'League ID is required',
      });
      return;
    }

    try {
      // Check if user has access to this specific league
      const scope = await prisma.pathfinderScope.findFirst({
        where: {
          pathfinderId: req.user.userId,
          leagueId: leagueId as string
        }
      });

      if (!scope) {
        res.status(403).json({
          success: false,
          error: 'No access to this league',
          leagueId: leagueId
        });
        return;
      }

      // Add scope permissions to request for use in controllers
      (req as any).leagueScope = scope;
      next();
    } catch (error) {
      console.error('League authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
      });
    }
  };
};

/**
 * Check if user can manage users in a specific league
 */
export const authorizeLeagueUserManagement = (leagueIdParam: string = 'leagueId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // First check basic league access
    await new Promise<void>((resolve, reject) => {
      authorizeForLeague(leagueIdParam)(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // GRAND_PATHFINDER and CHIEF_PATHFINDER can manage all users
    if (req.user?.role === UserRole.GRAND_PATHFINDER || req.user?.role === UserRole.CHIEF_PATHFINDER) {
      next();
      return;
    }

    // Check specific permission for user management
    const scope = (req as any).leagueScope;
    if (!scope?.canManageUsers) {
      res.status(403).json({
        success: false,
        error: 'No user management permissions for this league',
      });
      return;
    }

    next();
  };
};

/**
 * Check if user can create content in a specific league
 */
export const authorizeLeagueContentCreation = (leagueIdParam: string = 'leagueId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // First check basic league access
    await new Promise<void>((resolve, reject) => {
      authorizeForLeague(leagueIdParam)(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // GRAND_PATHFINDER and CHIEF_PATHFINDER can create all content
    if (req.user?.role === UserRole.GRAND_PATHFINDER || req.user?.role === UserRole.CHIEF_PATHFINDER) {
      next();
      return;
    }

    // Check specific permission for content creation
    const scope = (req as any).leagueScope;
    if (!scope?.canCreateContent) {
      res.status(403).json({
        success: false,
        error: 'No content creation permissions for this league',
      });
      return;
    }

    next();
  };
};

/**
 * God mode authorization - only GRAND_PATHFINDER
 * Use this for extremely sensitive operations
 */
export const requireGrandPathfinder = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== UserRole.GRAND_PATHFINDER) {
    res.status(403).json({
      success: false,
      error: 'Grand Pathfinder access required',
    });
    return;
  }

  next();
};
