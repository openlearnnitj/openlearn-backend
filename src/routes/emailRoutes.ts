import express from 'express';
import EmailController from '../controllers/emailController';
import { EmailTemplateController } from '../controllers/EmailTemplateController';
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

// Template management (Enhanced with new controller)
router.get('/templates', 
  authMiddleware, 
  EmailTemplateController.getTemplates
);

router.get('/templates/:templateId', 
  authMiddleware, 
  EmailTemplateController.getTemplate
);

router.post('/templates', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  EmailTemplateController.createTemplate
);

router.put('/templates/:templateId', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  EmailTemplateController.updateTemplate
);

router.delete('/templates/:templateId', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  EmailTemplateController.deleteTemplate
);

// New enhanced template endpoints
router.post('/templates/:templateId/duplicate', 
  authMiddleware, 
  authorize([UserRole.PATHFINDER]),
  EmailTemplateController.duplicateTemplate
);

router.post('/templates/:templateId/preview', 
  authMiddleware, 
  EmailTemplateController.previewTemplate
);

router.get('/templates/:templateId/variables', 
  authMiddleware, 
  EmailTemplateController.getTemplateVariables
);

export default router;
