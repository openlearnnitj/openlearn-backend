import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';

export class PathfinderScopeMiddleware {
  /**
   * Require a specific permission in any scope for the current pathfinder
   * Usage: PathfinderScopeMiddleware.requirePermission('canManageUsers')
   */
  static requirePermission(permission: 'canManageUsers' | 'canViewAnalytics' | 'canCreateContent') {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== UserRole.PATHFINDER) {
        return res.status(403).json({ success: false, error: 'Pathfinder role required' });
      }
      const userId = req.user.userId;
      const scopes = await prisma.pathfinderScope.findMany({
        where: { pathfinderId: userId, [permission]: true }
      });
      if (!scopes.length) {
        return res.status(403).json({ success: false, error: `Permission ${permission} required in at least one scope` });
      }
      req.pathfinderScopes = scopes;
      next();
    };
  }

  /**
   * Require access to a specific cohort
   */
  static requireCohortAccess(cohortIdParam: string = 'cohortId') {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== UserRole.PATHFINDER) {
        return res.status(403).json({ success: false, error: 'Pathfinder role required' });
      }
      const userId = req.user.userId;
      const cohortId = req.params[cohortIdParam] || req.body[cohortIdParam];
      if (!cohortId) {
        return res.status(400).json({ success: false, error: 'Cohort ID required' });
      }
      const scope = await prisma.pathfinderScope.findFirst({
        where: { pathfinderId: userId, cohortId }
      });
      if (!scope) {
        return res.status(403).json({ success: false, error: 'No access to this cohort' });
      }
      req.pathfinderScope = scope;
      next();
    };
  }

  /**
   * Require access to a specific specialization
   */
  static requireSpecializationAccess(specializationIdParam: string = 'specializationId') {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== UserRole.PATHFINDER) {
        return res.status(403).json({ success: false, error: 'Pathfinder role required' });
      }
      const userId = req.user.userId;
      const specializationId = req.params[specializationIdParam] || req.body[specializationIdParam];
      if (!specializationId) {
        return res.status(400).json({ success: false, error: 'Specialization ID required' });
      }
      const scope = await prisma.pathfinderScope.findFirst({
        where: { pathfinderId: userId, specializationId }
      });
      if (!scope) {
        return res.status(403).json({ success: false, error: 'No access to this specialization' });
      }
      req.pathfinderScope = scope;
      next();
    };
  }

  /**
   * Require access to a specific league
   */
  static requireLeagueAccess(leagueIdParam: string = 'leagueId') {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== UserRole.PATHFINDER) {
        return res.status(403).json({ success: false, error: 'Pathfinder role required' });
      }
      const userId = req.user.userId;
      const leagueId = req.params[leagueIdParam] || req.body[leagueIdParam];
      if (!leagueId) {
        return res.status(400).json({ success: false, error: 'League ID required' });
      }
      const scope = await prisma.pathfinderScope.findFirst({
        where: { pathfinderId: userId, leagueId }
      });
      if (!scope) {
        return res.status(403).json({ success: false, error: 'No access to this league' });
      }
      req.pathfinderScope = scope;
      next();
    };
  }
}

// Extend Express Request type for scopes
declare global {
  namespace Express {
    interface Request {
      pathfinderScopes?: any[];
      pathfinderScope?: any;
    }
  }
}
