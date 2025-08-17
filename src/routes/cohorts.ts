import { Router } from 'express';
import { CohortController } from '../controllers/cohortController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /cohorts
 * @desc Get all cohorts with filtering and pagination
 * @access All authenticated users
 * @query isActive - Filter by active status (true/false)
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/', CohortController.getCohorts);

/**
 * @route GET /cohorts/:cohortId
 * @desc Get detailed cohort information by ID
 * @access All authenticated users
 */
router.get('/:cohortId', CohortController.getCohortById);

// Admin-only routes (Pathfinders and above)
router.use(AuthMiddleware.requireRole(
  UserRole.GRAND_PATHFINDER, 
  UserRole.CHIEF_PATHFINDER, 
  UserRole.PATHFINDER
));

/**
 * @route POST /cohorts
 * @desc Create a new cohort
 * @access Pathfinder and above with canCreateContent permission
 * @body name - Cohort name (required)
 * @body description - Cohort description (optional)
 * @body isActive - Whether cohort is active (default: true)
 */
router.post('/', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'),
  CohortController.createCohort
);

/**
 * @route PUT /cohorts/:cohortId
 * @desc Update cohort information
 * @access Pathfinder and above with cohort access and canCreateContent permission
 * @body name - Updated cohort name
 * @body description - Updated description
 * @body isActive - Updated active status
 */
router.put('/:cohortId', 
  PathfinderScopeMiddleware.requireCohortAccess('cohortId'),
  CohortController.updateCohort
);

/**
 * @route DELETE /cohorts/:cohortId
 * @desc Delete a cohort (only if no enrollments/specializations)
 * @access Pathfinder and above with cohort access and canCreateContent permission
 */
router.delete('/:cohortId', 
  PathfinderScopeMiddleware.requireCohortAccess('cohortId'),
  CohortController.deleteCohort
);

export default router;
