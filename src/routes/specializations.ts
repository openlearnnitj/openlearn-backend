// filepath: /src/routes/specializations.ts
import { Router } from 'express';
import { SpecializationController } from '../controllers/specializationController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route   POST /api/specializations
 * @desc    Create a new specialization
 * @access  Pathfinder with canCreateContent permission
 */
router.post('/', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  SpecializationController.createSpecialization
);

/**
 * @route   GET /api/specializations
 * @desc    Get all specializations with optional filtering
 * @access  All authenticated users
 */
router.get('/', SpecializationController.getSpecializations);

/**
 * @route   GET /api/specializations/:id
 * @desc    Get a specific specialization by ID
 * @access  All authenticated users
 */
router.get('/:id', SpecializationController.getSpecializationById);

/**
 * @route   PUT /api/specializations/:id
 * @desc    Update a specialization
 * @access  Pathfinder with canCreateContent permission
 */
router.put('/:id', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  SpecializationController.updateSpecialization
);

/**
 * @route   DELETE /api/specializations/:id
 * @desc    Delete a specialization
 * @access  Pathfinder with canManageUsers permission (high-level admin action)
 */
router.delete('/:id', 
  PathfinderScopeMiddleware.requirePermission('canManageUsers'), 
  SpecializationController.deleteSpecialization
);

export default router;
