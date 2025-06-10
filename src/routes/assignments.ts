import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route POST /api/assignments
 * @desc Create assignment for a league
 * @access Pathfinder+
 */
router.post('/', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  AssignmentController.createAssignment
);

/**
 * @route GET /api/assignments
 * @desc Get all assignments (Admin view)
 * @access Pathfinder+
 */
router.get('/', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
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

export default router;
