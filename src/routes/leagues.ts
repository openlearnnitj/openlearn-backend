import { Router } from 'express';
import { LeagueController } from '../controllers/leagueController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /leagues
 * @desc Get all leagues with filtering and pagination
 * @access All authenticated users
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/', LeagueController.getLeagues);

/**
 * @route GET /leagues/:leagueId
 * @desc Get detailed league information by ID
 * @access All authenticated users
 */
router.get('/:leagueId', LeagueController.getLeagueById);

/**
 * @route GET /leagues/:leagueId/stats
 * @desc Get league statistics
 * @access All authenticated users
 */
router.get('/:leagueId/stats', LeagueController.getLeagueStats);

/**
 * @route POST /leagues
 * @desc Create a new league
 * @access Pathfinder with canCreateContent permission
 * @body name - League name (required)
 * @body description - League description (optional)
 */
router.post('/', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  LeagueController.createLeague
);

/**
 * @route PUT /leagues/:leagueId
 * @desc Update league information
 * @access Pathfinder with canCreateContent permission
 * @body name - Updated league name
 * @body description - Updated description
 */
router.put('/:leagueId', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  LeagueController.updateLeague
);

/**
 * @route DELETE /leagues/:leagueId
 * @desc Delete a league (only if no enrollments/weeks/badges)
 * @access Pathfinder with canManageUsers permission (admin action)
 */
router.delete('/:leagueId', 
  PathfinderScopeMiddleware.requirePermission('canManageUsers'), 
  LeagueController.deleteLeague
);

export default router;
