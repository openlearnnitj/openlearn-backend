import { Router } from 'express';
import { ResourceController } from '../controllers/resourceController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All resource routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route POST /api/sections/:sectionId/resources
 * @desc Create a new resource in a section
 * @access Chief Pathfinder+
 */
router.post('/sections/:sectionId/resources', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
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
 * @access Pathfinder+
 */
router.get('/resources', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
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
 * @access Chief Pathfinder+
 */
router.put('/resources/:id', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  ResourceController.updateResource
);

/**
 * @route DELETE /api/resources/:id
 * @desc Delete a resource
 * @access Chief Pathfinder+
 */
router.delete('/resources/:id', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  ResourceController.deleteResource
);

/**
 * @route PUT /api/sections/:sectionId/resources/reorder
 * @desc Reorder resources within a section
 * @access Chief Pathfinder+
 */
router.put('/sections/:sectionId/resources/reorder', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  ResourceController.reorderResources
);

export default router;
