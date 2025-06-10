
import { Router } from 'express';
import { BadgeController } from '../controllers/badgeController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All badge routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/badges
 * @desc Get all badges with user's earned status
 * @access All authenticated users
 */
router.get('/', BadgeController.getAllBadges);

/**
 * @route GET /api/badges/my-badges
 * @desc Get current user's earned badges
 * @access All authenticated users
 */
router.get('/my-badges', BadgeController.getMyBadges);

/**
 * @route GET /api/badges/analytics
 * @desc Get badge analytics and statistics
 * @access Chief Pathfinder, Grand Pathfinder
 */
router.get('/analytics', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  BadgeController.getBadgeAnalytics
);

/**
 * @route POST /api/badges
 * @desc Create a new badge
 * @access Chief Pathfinder, Grand Pathfinder
 */
router.post('/', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  BadgeController.createBadge
);

/**
 * @route PUT /api/badges/:id
 * @desc Update a badge
 * @access Chief Pathfinder, Grand Pathfinder
 */
router.put('/:id', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  BadgeController.updateBadge
);

/**
 * @route POST /api/badges/:id/award
 * @desc Manually award a badge to a user
 * @access Pathfinder, Chief Pathfinder, Grand Pathfinder
 */
router.post('/:id/award', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  BadgeController.awardBadge
);

/**
 * @route DELETE /api/badges/:id/revoke
 * @desc Revoke a badge from a user
 * @access Chief Pathfinder, Grand Pathfinder
 */
router.delete('/:id/revoke', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  BadgeController.revokeBadge
);

/**
 * @route DELETE /api/badges/:id
 * @desc Delete a badge (only if no users have earned it)
 * @access Grand Pathfinder only
 */
router.delete('/:id', 
  AuthMiddleware.requireRole(UserRole.GRAND_PATHFINDER),
  BadgeController.deleteBadge
);

export default router;
