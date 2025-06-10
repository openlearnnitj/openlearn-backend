import { Router } from 'express';
import { ProgressController } from '../controllers/progressController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all progress routes
router.use(AuthMiddleware.authenticate);

/**
 * Progress Tracking Routes
 * 
 * These routes handle user progress tracking, enrollment, and analytics
 * for the OpenLearn educational platform.
 * 
 * Route Structure:
 * - /api/progress/enroll - User enrollment in cohorts/leagues
 * - /api/progress/sections/:sectionId/complete - Mark section as completed
 * - /api/progress/sections/:sectionId - Update section progress (notes, revision)
 * - /api/progress/leagues/:leagueId - Get league progress for user
 * - /api/progress/dashboard - Get user's overall progress dashboard
 * - /api/progress/enrollments - Admin view of all enrollments
 */

/**
 * @route POST /api/progress/enroll
 * @desc Enroll user in a cohort and league
 * @access All authenticated users (self-enrollment) or Pathfinder+ (enroll others)
 * @body userId - Target user ID (optional, defaults to current user)
 * @body cohortId - Cohort ID to enroll in (required)
 * @body leagueId - League ID to enroll in (required)
 */
router.post('/enroll', ProgressController.enrollUser);

/**
 * @route POST /api/progress/sections/:sectionId/complete
 * @desc Mark a section as completed and optionally add personal notes
 * @access All authenticated users (only for their own progress)
 * @params sectionId - ID of the section to mark as complete
 * @body personalNote - Optional personal note for the section
 * @body markedForRevision - Optional flag to mark section for future revision
 */
router.post('/sections/:sectionId/complete', ProgressController.markSectionComplete);

/**
 * @route PUT /api/progress/sections/:sectionId
 * @desc Update section progress without marking as complete (update notes/revision flag)
 * @access All authenticated users (only for their own progress)
 * @params sectionId - ID of the section to update
 * @body personalNote - Personal note for the section
 * @body markedForRevision - Flag to mark section for future revision
 */
router.put('/sections/:sectionId', ProgressController.updateSectionProgress);

/**
 * @route GET /api/progress/leagues/:leagueId
 * @desc Get user's progress for a specific league
 * @access All authenticated users (own progress) or Pathfinder+ (any user with ?userId=)
 * @params leagueId - League ID to get progress for
 * @query userId - Optional user ID (Pathfinder+ only, defaults to current user)
 */
router.get('/leagues/:leagueId', ProgressController.getLeagueProgress);

/**
 * @route GET /api/progress/dashboard
 * @desc Get user's overall progress dashboard across all enrollments
 * @access All authenticated users (own dashboard) or Pathfinder+ (any user with ?userId=)
 * @query userId - Optional user ID (Pathfinder+ only, defaults to current user)
 */
router.get('/dashboard', ProgressController.getUserDashboard);

/**
 * @route GET /api/progress/enrollments
 * @desc Get all enrollments with progress (admin view)
 * @access Pathfinder+ only
 * @query page - Page number for pagination (default: 1)
 * @query limit - Items per page (default: 10)
 * @query cohortId - Filter by cohort ID (optional)
 * @query leagueId - Filter by league ID (optional)
 * @query userId - Filter by user ID (optional)
 */
router.get('/enrollments', ProgressController.getAllEnrollments);

export default router;
