import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';
import { AuthMiddleware } from '../middleware/auth';
import { PathfinderScopeMiddleware } from '../middleware/pathfinderScope';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(AuthMiddleware.authenticate);

router.post('/', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  SectionController.createSection
);

router.get('/', 
  PathfinderScopeMiddleware.requirePermission('canViewAnalytics'), 
  SectionController.getAllSections
);

router.get('/:id', SectionController.getSectionById);

router.put('/:id', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  SectionController.updateSection
);

router.delete('/:id', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  SectionController.deleteSection
);

export default router;
