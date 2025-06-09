import { Router } from 'express';
import { WeekController } from '../controllers/weekController';
import { SectionController } from '../controllers/sectionController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route   POST /api/weeks
 * @desc    Create a new week in a league
 * @access  Chief Pathfinder+
 */
router.post('/', AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), WeekController.createWeek);

/**
 * @route   GET /api/weeks
 * @desc    Get all weeks (admin view with filtering)
 * @access  Pathfinder+
 */
router.get('/', AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), WeekController.getAllWeeks);

/**
 * @route   GET /api/leagues/:leagueId/weeks
 * @desc    Get all weeks for a specific league
 * @access  All authenticated users
 */
router.get('/league/:leagueId', WeekController.getWeeksByLeague);

/**
 * @route   GET /api/weeks/:id
 * @desc    Get a specific week by ID with all sections
 * @access  All authenticated users
 */
router.get('/:id', WeekController.getWeekById);

/**
 * @route   GET /api/weeks/:id/sections
 * @desc    Get all sections for a specific week
 * @access  All authenticated users
 */
router.get('/:id/sections', SectionController.getSectionsByWeek);

/**
 * @route   PUT /api/weeks/:id
 * @desc    Update a week
 * @access  Chief Pathfinder+
 */
router.put('/:id', AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), WeekController.updateWeek);

/**
 * @route   DELETE /api/weeks/:id
 * @desc    Delete a week
 * @access  Grand Pathfinder only
 */
router.delete('/:id', AuthMiddleware.requireRole(UserRole.GRAND_PATHFINDER), WeekController.deleteWeek);

/**
 * @route   PUT /api/weeks/:id/sections/reorder
 * @desc    Reorder sections within a week
 * @access  Chief Pathfinder+
 */
router.put('/:id/sections/reorder', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  SectionController.reorderSections
);

export default router;
