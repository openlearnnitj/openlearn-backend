import { Router } from 'express';
import { ProjectSubmissionController } from '../controllers/projectSubmissionController';
import { AuthMiddleware } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

/**
 * @route POST /project-submissions/submit
 * @desc Submit a project submission
 * @access Public (but validates team members are registered users)
 * @body Project submission data with team information
 */
router.post('/submit', 
  generalRateLimit,
  ProjectSubmissionController.submitProject
);

/**
 * @route GET /project-submissions/admin
 * @desc Get all project submissions (Admin only)
 * @access Grand Pathfinder only
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 */
router.get('/admin',
  AuthMiddleware.authenticate,
  ProjectSubmissionController.getSubmissions
);

/**
 * @route GET /project-submissions/admin/stats
 * @desc Get submission statistics (Admin only)
 * @access Grand Pathfinder only
 */
router.get('/admin/stats',
  AuthMiddleware.authenticate,
  ProjectSubmissionController.getSubmissionStats
);

export default router;
