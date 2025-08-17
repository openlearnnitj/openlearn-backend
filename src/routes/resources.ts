import { Router } from 'express';
import { ResourceController } from '../controllers/resourceController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

// All resource routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route POST /api/sections/:sectionId/resources
 * @desc Create a new resource in a section
 * @access Pathfinder with canCreateContent permission
 */
router.post('/sections/:sectionId/resources', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  ResourceController.createResource
);

/**
 * @route GET /api/sections/:sectionId/resources
 * @desc Get all resources for a specific section
 * @access All authenticated users
 */
router.get('/sections/:sectionId/resources', ResourceController.getResourcesBySection);

/**
 * @route GET /api/resources
 * @desc Get all resources (admin view with filtering)
 * @access Pathfinder with canViewAnalytics permission
 */
router.get('/resources', 
  PathfinderScopeMiddleware.requirePermission('canViewAnalytics'), 
  ResourceController.getAllResources
);

/**
 * @route GET /api/resources/:id
 * @desc Get a specific resource by ID
 * @access All authenticated users
 */
router.get('/resources/:id', ResourceController.getResourceById);

/**
 * @route PUT /api/resources/:id
 * @desc Update a resource
 * @access Pathfinder with canCreateContent permission
 */
router.put('/resources/:id', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  ResourceController.updateResource
);

/**
 * @route DELETE /api/resources/:id
 * @desc Delete a resource
 * @access Pathfinder with canCreateContent permission
 */
router.delete('/resources/:id', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  ResourceController.deleteResource
);

/**
 * @route PUT /api/sections/:sectionId/resources/reorder
 * @desc Reorder resources within a section
 * @access Pathfinder with canCreateContent permission
 */
router.put('/sections/:sectionId/resources/reorder', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  ResourceController.reorderResources
);

export default router;
