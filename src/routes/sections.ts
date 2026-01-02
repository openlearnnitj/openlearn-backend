import { authorize, authorizeForLeague } from '../middleware/enhancedAuthorization';
import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';
import { ResourceController } from '../controllers/resourceController';
import { AuthMiddleware } from '../middleware/auth';

import { UserRole } from '@prisma/client';

const router = Router();

router.use(AuthMiddleware.authenticate);

router.post('/', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  SectionController.createSection
);

router.get('/', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  SectionController.getAllSections
);

router.get('/:id', SectionController.getSectionById);

router.put('/:id', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  SectionController.updateSection
);

router.delete('/:id', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  SectionController.deleteSection
);

// Resource routes under sections (e.g., /api/sections/:sectionId/resources)
/**
 * @route POST /api/sections/:sectionId/resources
 * @desc Create a new resource in a section
 * @access Pathfinder with canCreateContent permission
 */
router.post('/:sectionId/resources', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  ResourceController.createResource
);

/**
 * @route GET /api/sections/:sectionId/resources
 * @desc Get all resources for a specific section
 * @access All authenticated users
 */
router.get('/:sectionId/resources', ResourceController.getResourcesBySection);

/**
 * @route PUT /api/sections/:sectionId/resources/reorder
 * @desc Reorder resources within a section
 * @access Pathfinder with canCreateContent permission
 */
router.put('/:sectionId/resources/reorder', 
  authorize([UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER]), 
  ResourceController.reorderResources
);

export default router;
