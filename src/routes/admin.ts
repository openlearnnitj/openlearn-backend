import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
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

export default router;
