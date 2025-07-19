import express from 'express';
import EmailController from '../controllers/emailController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '@prisma/client';

const router = express.Router();
const emailController = new EmailController();

/**
 * Email Management Routes
 * All routes require authentication
 */

// Email sending endpoints
router.post('/send', 
  authMiddleware, 
  emailController.sendEmail.bind(emailController)
);

router.post('/bulk', 
  authMiddleware, 
  emailController.sendBulkEmail.bind(emailController)
);

// Email job management
router.get('/jobs', 
  authMiddleware, 
  emailController.getEmailJobs.bind(emailController)
);

router.get('/jobs/:jobId', 
  authMiddleware, 
  emailController.getEmailJob.bind(emailController)
);

router.post('/jobs/:jobId/cancel', 
  authMiddleware, 
  emailController.cancelEmailJob.bind(emailController)
);

// Analytics (admin only)
router.get('/analytics', 
  authMiddleware, 
  emailController.getEmailAnalytics.bind(emailController)
);

// SMTP testing (admin only)
router.get('/test-smtp', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  emailController.testSMTP.bind(emailController)
);

// Template management
router.get('/templates', 
  authMiddleware, 
  emailController.getTemplates.bind(emailController)
);

router.get('/templates/:templateId', 
  authMiddleware, 
  emailController.getTemplate.bind(emailController)
);

router.post('/templates', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  emailController.createTemplate.bind(emailController)
);

router.put('/templates/:templateId', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  emailController.updateTemplate.bind(emailController)
);

router.delete('/templates/:templateId', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  emailController.deleteTemplate.bind(emailController)
);

export default router;
