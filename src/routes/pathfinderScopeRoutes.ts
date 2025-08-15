import express from 'express';
import { PathfinderScopeController } from '../controllers/PathfinderScopeController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '@prisma/client';

const router = express.Router();
const pathfinderScopeController = new PathfinderScopeController();

/**
 * Pathfinder Scope Management Routes
 * These routes handle hierarchical permissions for Pathfinders
 */

// Get all pathfinder scopes (with filtering)
router.get('/',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.getAllScopes.bind(pathfinderScopeController)
);

// Get current user's pathfinder scopes
router.get('/my-scopes',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.getMyScopes.bind(pathfinderScopeController)
);

// Get specific scope by ID
router.get('/:id',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.getScopeById.bind(pathfinderScopeController)
);

// Get all scopes for a specific user
router.get('/user/:userId',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.getUserScopes.bind(pathfinderScopeController)
);

// Create new pathfinder scope
router.post('/',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.createScope.bind(pathfinderScopeController)
);

// Update existing scope
router.put('/:id',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.updateScope.bind(pathfinderScopeController)
);

// Delete scope
router.delete('/:id',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.deleteScope.bind(pathfinderScopeController)
);

// Bulk assign scopes to multiple users
router.post('/bulk-assign',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.bulkAssignScopes.bind(pathfinderScopeController)
);

// Get users within a pathfinder's scope
router.get('/scope/:scopeId/users',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.getUsersInScope.bind(pathfinderScopeController)
);

// Check if user has permission for specific action in scope
router.post('/check-permission',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  pathfinderScopeController.checkPermission.bind(pathfinderScopeController)
);

export default router;
