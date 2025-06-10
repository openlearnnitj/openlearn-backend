import { Router } from 'express';
import { ResourceProgressController } from '../controllers/resourceProgressController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/resource-progress/:resourceId
 * @desc Get user's progress for a specific resource
 * @access All authenticated users
 */
router.get('/:resourceId', ResourceProgressController.getResourceProgress);

/**
 * @route POST /api/resource-progress/:resourceId/complete
 * @desc Mark a resource as completed
 * @access All authenticated users
 */
router.post('/:resourceId/complete', ResourceProgressController.markResourceCompleted);

/**
 * @route POST /api/resource-progress/:resourceId/revision
 * @desc Mark a resource for revision
 * @access All authenticated users
 */
router.post('/:resourceId/revision', ResourceProgressController.markResourceForRevision);

/**
 * @route PUT /api/resource-progress/:resourceId/note
 * @desc Update personal note for a resource
 * @access All authenticated users
 */
router.put('/:resourceId/note', ResourceProgressController.updateResourceNote);

/**
 * @route DELETE /api/resource-progress/:resourceId/reset
 * @desc Reset resource progress (unmark as completed/revision)
 * @access All authenticated users
 */
router.delete('/:resourceId/reset', ResourceProgressController.resetResourceProgress);

/**
 * @route GET /api/resource-progress/section/:sectionId/resources
 * @desc Get all resources with progress for a specific section
 * @access All authenticated users
 */
router.get('/section/:sectionId/resources', ResourceProgressController.getSectionResourcesWithProgress);

/**
 * @route GET /api/resource-progress/revision/list
 * @desc Get user's resources marked for revision
 * @access All authenticated users
 */
router.get('/revision/list', ResourceProgressController.getResourcesMarkedForRevision);

export default router;
