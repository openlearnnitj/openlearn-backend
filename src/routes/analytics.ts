import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { HierarchicalAnalyticsController } from '../controllers/hierarchicalAnalyticsController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/analytics/platform
 * @desc Get platform overview statistics
 * @access Pathfinder+ with canViewAnalytics permission
 */
router.get('/platform', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  PathfinderScopeMiddleware.requirePermission('canViewAnalytics'),
  AnalyticsController.getPlatformStats
);

/**
 * @route GET /api/analytics/cohort/:cohortId
 * @desc Get cohort performance analytics
 * @access Pathfinder+ with cohort access and canViewAnalytics permission
 */
router.get('/cohort/:cohortId',
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  PathfinderScopeMiddleware.requireCohortAccess('cohortId'),
  AnalyticsController.getCohortAnalytics
);

/**
 * @route GET /api/analytics/user/:userId
 * @desc Get user performance report
 * @access All authenticated users (self) or Pathfinder+ (any user)
 */
router.get('/user/:userId', AnalyticsController.getUserReport);

/**
 * @route GET /api/analytics/counts
 * @desc Get hierarchical count analytics (total and completed for all levels)
 * @query userId (optional) - specific user ID, defaults to current user
 * @query leagueId (optional) - get detailed breakdown for specific league
 * @query weekId (optional) - get counts for specific week
 * @query sectionId (optional) - get counts for specific section
 * @access All authenticated users
 */
router.get('/counts', HierarchicalAnalyticsController.getHierarchicalCounts);

export default router;
