import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { AssignmentController } from '../controllers/assignmentController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole(UserRole.GRAND_PATHFINDER, UserRole.CHIEF_PATHFINDER));

/**
 * @route GET /admin/users
 * @desc Get all users with filtering and pagination
 * @access Grand Pathfinder, Chief Pathfinder
 * @query status - Filter by user status (PENDING, ACTIVE, SUSPENDED)
 * @query role - Filter by user role
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/users', AdminController.getUsers);

/**
 * @route GET /admin/pending-users
 * @desc Get all pending users awaiting approval
 * @access Grand Pathfinder, Chief Pathfinder
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
router.get('/pending-users', AdminController.getPendingUsers);

/**
 * @route GET /admin/users/:userId
 * @desc Get detailed user information by ID
 * @access Grand Pathfinder, Chief Pathfinder
 */
router.get('/users/:userId', AdminController.getUserById);

/**
 * @route PUT /admin/users/:userId/approve
 * @desc Approve a pending user and optionally assign role
 * @access Grand Pathfinder, Chief Pathfinder
 * @body role? - Optional role to assign (defaults to current role)
 */
router.put('/users/:userId/approve', AdminController.approveUser);

/**
 * @route POST /admin/approve-user
 * @desc Approve a pending user (alternative endpoint matching documentation)
 * @access Grand Pathfinder, Chief Pathfinder
 * @body userId - User ID to approve
 * @body role? - Optional role to assign (defaults to current role)
 */
router.post('/approve-user', AdminController.approveUserAlternative);

/**
 * @route POST /admin/update-role
 * @desc Update user role (alternative endpoint matching documentation)
 * @access Grand Pathfinder, Chief Pathfinder
 * @body userId - User ID to update
 * @body newRole - New role to assign
 */
router.put('/update-role', AdminController.updateUserRoleAlternative);

/**
 * @route PUT /admin/update-status
 * @desc Update user status (alternative endpoint matching documentation)
 * @access Grand Pathfinder, Chief Pathfinder
 * @body userId - User ID to update
 * @body newStatus - New status to assign
 */
router.put('/update-status', AdminController.updateUserStatusAlternative);

/**
 * @route PUT /admin/users/:userId/role
 * @desc Update user role
 * @access Grand Pathfinder, Chief Pathfinder
 * @body role - New role to assign
 */
router.put('/users/:userId/role', AdminController.updateUserRole);

/**
 * @route PUT /admin/users/:userId/status
 * @desc Update user status (suspend/activate)
 * @access Grand Pathfinder, Chief Pathfinder
 * @body status - New status (ACTIVE or SUSPENDED)
 */
router.put('/users/:userId/status', AdminController.updateUserStatus);

/**
 * @route POST /admin/assignments
 * @desc Create assignment for a league
 * @access Grand Pathfinder, Chief Pathfinder
 */
router.post('/assignments', AssignmentController.createAssignment);

/**
 * @route GET /admin/assignments
 * @desc Get all assignments
 * @access Grand Pathfinder, Chief Pathfinder
 */
router.get('/assignments', AssignmentController.getAllAssignments);

/**
 * @route GET /admin/assignments/league/:leagueId
 * @desc Get assignment by league ID
 * @access Grand Pathfinder, Chief Pathfinder
 */
router.get('/assignments/league/:leagueId', AssignmentController.getAssignmentByLeague);

/**
 * @route PUT /admin/assignments/:assignmentId
 * @desc Update an assignment
 * @access Grand Pathfinder, Chief Pathfinder
 * @body title? - Optional assignment title
 * @body description? - Optional assignment description
 * @body dueDate? - Optional due date
 */
router.put('/assignments/:assignmentId', AssignmentController.updateAssignment);

/**
 * @route DELETE /admin/assignments/:assignmentId
 * @desc Delete an assignment (only if no submissions exist)
 * @access Grand Pathfinder, Chief Pathfinder
 */
router.delete('/assignments/:assignmentId', AssignmentController.deleteAssignment);

export default router;
