import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/analytics/platform
 * @desc Get platform overview statistics
 * @access Pathfinder+
 */
router.get('/platform', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  AnalyticsController.getPlatformStats
);

/**
 * @route GET /api/analytics/cohort/:cohortId
 * @desc Get cohort performance analytics
 * @access Pathfinder+
 */
router.get('/cohort/:cohortId',
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  AnalyticsController.getCohortAnalytics
);

/**
 * @route GET /api/analytics/user/:userId
 * @desc Get user performance report
 * @access All authenticated users (self) or Pathfinder+ (any user)
 */
router.get('/user/:userId', AnalyticsController.getUserReport);

export default router;
