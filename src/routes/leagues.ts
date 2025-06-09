import { Router } from 'express';
import { LeagueController } from '../controllers/leagueController';
import { AuthMiddleware } from '../middleware/auth';
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

// Admin-only routes (Pathfinders and above)
router.use(AuthMiddleware.requireRole(
  UserRole.GRAND_PATHFINDER, 
  UserRole.CHIEF_PATHFINDER, 
  UserRole.PATHFINDER
));

/**
 * @route POST /leagues
 * @desc Create a new league
 * @access Pathfinder and above
 * @body name - League name (required)
 * @body description - League description (optional)
 */
router.post('/', LeagueController.createLeague);

/**
 * @route PUT /leagues/:leagueId
 * @desc Update league information
 * @access Pathfinder and above
 * @body name - Updated league name
 * @body description - Updated description
 */
router.put('/:leagueId', LeagueController.updateLeague);

/**
 * @route DELETE /leagues/:leagueId
 * @desc Delete a league (only if no enrollments/weeks/badges)
 * @access Pathfinder and above
 */
router.delete('/:leagueId', LeagueController.deleteLeague);

export default router;
