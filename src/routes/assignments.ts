import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route POST /api/assignments
 * @desc Create assignment for a league
 * @access Pathfinder+ with canCreateContent permission
 */
router.post('/', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'),
  AssignmentController.createAssignment
);

/**
 * @route GET /api/assignments
 * @desc Get all assignments (Admin view)
 * @access Pathfinder+ with canViewAnalytics permission
 */
router.get('/', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  PathfinderScopeMiddleware.requirePermission('canViewAnalytics'),
  AssignmentController.getAllAssignments
);

/**
 * @route GET /api/assignments/league/:leagueId
 * @desc Get assignment by league ID
 * @access All authenticated users
 */
router.get('/league/:leagueId', AssignmentController.getAssignmentByLeague);

/**
 * @route POST /api/assignments/:assignmentId/submit
 * @desc Submit assignment
 * @access All authenticated users
 */
router.post('/:assignmentId/submit', AssignmentController.submitAssignment);

/**
 * @route GET /api/assignments/submissions
 * @desc Get user's assignment submissions
 * @access All authenticated users (own submissions) or Pathfinder+ (any user with ?userId=)
 */
router.get('/submissions', AssignmentController.getUserSubmissions);

/**
 * @route GET /api/assignments/my-submissions
 * @desc Get current user's assignment submissions (user-friendly alias)
 * @access All authenticated users
 */
router.get('/my-submissions', AssignmentController.getUserSubmissions);

/**
 * @route PUT /api/assignments/:assignmentId
 * @desc Update an assignment
 * @access Pathfinder+ with canCreateContent permission
 */
router.put('/:assignmentId', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'),
  AssignmentController.updateAssignment
);

/**
 * @route DELETE /api/assignments/:assignmentId
 * @desc Delete an assignment (only if no submissions exist)
 * @access Pathfinder+ with canCreateContent permission
 */
router.delete('/:assignmentId', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'),
  AssignmentController.deleteAssignment
);

export default router;
