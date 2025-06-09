import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';
import { AuthMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(AuthMiddleware.authenticate);

router.post('/', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  SectionController.createSection
);

router.get('/', 
  AuthMiddleware.requireRole(UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  SectionController.getAllSections
);

router.get('/:id', SectionController.getSectionById);

router.put('/:id', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  SectionController.updateSection
);

router.delete('/:id', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER), 
  SectionController.deleteSection
);

export default router;
