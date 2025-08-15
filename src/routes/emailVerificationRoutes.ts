import express from 'express';
import { EmailVerificationController } from '../controllers/EmailVerificationController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { UserRole } from '@prisma/client';

const router = express.Router();
const emailVerificationController = new EmailVerificationController();

/**
 * Email Verification Routes
 * These routes handle email verification via OTP
 */

// Send OTP to user's email for verification
router.post('/send-verification-otp', 
  authMiddleware,
  emailVerificationController.sendVerificationOTP.bind(emailVerificationController)
);

// Verify email using OTP
router.post('/verify-email-otp',
  authMiddleware,
  emailVerificationController.verifyEmailOTP.bind(emailVerificationController)
);

// Check email verification status
router.get('/verification-status',
  authMiddleware,
  emailVerificationController.getVerificationStatus.bind(emailVerificationController)
);

// Resend verification OTP (with rate limiting)
router.post('/resend-verification-otp',
  authMiddleware,
  emailVerificationController.resendVerificationOTP.bind(emailVerificationController)
);

// Admin: Get verification status of any user
router.get('/verification-status/:userId',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  emailVerificationController.getUserVerificationStatus.bind(emailVerificationController)
);

// Admin: Manually verify a user's email
router.post('/admin-verify-email/:userId',
  authMiddleware,
  authorize([UserRole.PATHFINDER]),
  emailVerificationController.adminVerifyEmail.bind(emailVerificationController)
);

export default router;
