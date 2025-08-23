/**
 * League Assignment Routes
 * Routes for managing league access assignments for Pathfinders
 * Only accessible by GRAND_PATHFINDER (god mode)
 */

import express from 'express';
import { LeagueAssignmentController } from '../controllers/LeagueAssignmentController';
import { authMiddleware } from '../middleware/auth';
import { requireGrandPathfinder } from '../middleware/enhancedAuthorization';

const router = express.Router();

/**
 * All league assignment routes require GRAND_PATHFINDER access
 * This ensures only the supreme admin can manage league assignments
 */
router.use(authMiddleware);
router.use(requireGrandPathfinder);

/**
 * @route POST /api/admin/assign-leagues
 * @desc Assign leagues to a pathfinder
 * @access GRAND_PATHFINDER only
 * @body pathfinderId - ID of the pathfinder user
 * @body leagueIds - Array of league IDs to assign
 * @body permissions - Optional permission settings
 */
router.post('/assign-leagues', LeagueAssignmentController.assignLeaguesToPathfinder);

/**
 * @route GET /api/admin/pathfinder-leagues/:pathfinderId
 * @desc Get league assignments for a specific pathfinder
 * @access GRAND_PATHFINDER only
 * @param pathfinderId - ID of the pathfinder user
 */
router.get('/pathfinder-leagues/:pathfinderId', LeagueAssignmentController.getPathfinderLeagues);

/**
 * @route DELETE /api/admin/pathfinder-leagues/:pathfinderId/:leagueId
 * @desc Remove specific league assignment from pathfinder
 * @access GRAND_PATHFINDER only
 * @param pathfinderId - ID of the pathfinder user
 * @param leagueId - ID of the league to remove
 */
router.delete('/pathfinder-leagues/:pathfinderId/:leagueId', LeagueAssignmentController.removeLeagueFromPathfinder);

/**
 * @route GET /api/admin/pathfinder-assignments
 * @desc Get all pathfinders and their league assignments
 * @access GRAND_PATHFINDER only
 */
router.get('/pathfinder-assignments', LeagueAssignmentController.getAllPathfinderAssignments);

/**
 * @route PUT /api/admin/pathfinder-leagues/:pathfinderId/:leagueId/permissions
 * @desc Update permissions for a pathfinder's league assignment
 * @access GRAND_PATHFINDER only
 * @param pathfinderId - ID of the pathfinder user
 * @param leagueId - ID of the league
 * @body permissions - Permission settings (canManageUsers, canViewAnalytics, canCreateContent)
 */
router.put('/pathfinder-leagues/:pathfinderId/:leagueId/permissions', LeagueAssignmentController.updatePathfinderPermissions);

export default router;
