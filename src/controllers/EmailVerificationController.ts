import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { EmailVerificationService } from '../services/email/EmailVerificationService';
import { AuditAction, UserRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Simple audit logging function
 */
async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  description?: string;
  metadata: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        description: data.description,
        metadata: data.metadata
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Email Verification Controller
 * Handles email verification via OTP system using proper email service architecture
 */
export class EmailVerificationController {
  private emailVerificationService: EmailVerificationService;

  constructor() {
    this.emailVerificationService = new EmailVerificationService();
  }

  /**
   * Send OTP to user's email for verification
   * POST /api/auth/send-verification-otp
   */
  async sendVerificationOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Check rate limiting - only allow one OTP per 60 seconds
      const pendingInfo = await this.emailVerificationService.hasPendingOTP(user.email);
      
      if (pendingInfo.hasPending && pendingInfo.createdAt) {
        const timeSinceLastOTP = Date.now() - pendingInfo.createdAt.getTime();
        if (timeSinceLastOTP < 60000) { // 60 seconds
          res.status(429).json({ 
            error: 'OTP recently sent. Please wait before requesting another.',
            retryAfter: 60
          });
          return;
        }
      }

      // Generate and send OTP using the email verification service
      const result = await this.emailVerificationService.sendVerificationOTP(
        user.email,
        user.name || 'User'
      );

      if (result.success) {
        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditAction.EMAIL_SENT,
          description: 'Email verification OTP sent',
          metadata: {
            email: user.email,
            purpose: 'email_verification',
            resourceType: 'email_verification',
            resourceId: user.email
          }
        });

        res.status(200).json({
          success: true,
          message: 'Verification OTP sent successfully',
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
        });
      } else {
        res.status(500).json({
          error: 'Failed to send verification OTP',
          details: result.error
        });
      }

    } catch (error: any) {
      console.error('Error in sendVerificationOTP:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify email using OTP
   * POST /api/auth/verify-email-otp
   */
  async verifyEmailOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { otp } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!otp || typeof otp !== 'string') {
        res.status(400).json({ error: 'OTP is required' });
        return;
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Verify OTP using the email verification service
      const verificationResult = await this.emailVerificationService.verifyEmailOTP(user.email, otp);

      if (verificationResult.success) {
        // Mark email as verified
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true }
        });

        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditAction.USER_STATUS_CHANGED,
          description: 'Email verified successfully',
          metadata: {
            email: user.email,
            verifiedAt: new Date().toISOString(),
            action: 'email_verified',
            resourceType: 'email_verification',
            resourceId: user.email
          }
        });

        res.status(200).json({
          success: true,
          message: 'Email verified successfully',
          emailVerified: true
        });
      } else {
        // Create audit log for failed attempt
        await createAuditLog({
          userId: user.id,
          action: AuditAction.EMAIL_FAILED,
          description: 'Email verification failed - invalid OTP',
          metadata: {
            email: user.email,
            reason: verificationResult.error || 'Invalid OTP',
            attemptedAt: new Date().toISOString(),
            resourceType: 'email_verification',
            resourceId: user.email
          }
        });

        res.status(400).json({
          error: 'Invalid or expired OTP',
          details: verificationResult.error
        });
      }

    } catch (error: any) {
      console.error('Error in verifyEmailOTP:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email verification status
   * GET /api/auth/verification-status
   */
  async getVerificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if there's a pending OTP
      const pendingInfo = await this.emailVerificationService.hasPendingOTP(user.email);

      res.status(200).json({
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        emailVerified: user.emailVerified,
        pendingOTP: pendingInfo.hasPending,
        otpExpiresAt: pendingInfo.expiresAt || null,
        lastOTPSent: pendingInfo.createdAt || null
      });

    } catch (error: any) {
      console.error('Error in getVerificationStatus:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Resend verification OTP (with enhanced rate limiting)
   * POST /api/auth/resend-verification-otp
   */
  async resendVerificationOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Enhanced rate limiting - 3 minutes between resends
      const pendingInfo = await this.emailVerificationService.hasPendingOTP(user.email);
      
      if (pendingInfo.hasPending && pendingInfo.createdAt) {
        const timeSinceLastOTP = Date.now() - pendingInfo.createdAt.getTime();
        if (timeSinceLastOTP < 180000) { // 3 minutes
          const remainingTime = Math.ceil((180000 - timeSinceLastOTP) / 1000);
          res.status(429).json({ 
            error: 'Please wait before requesting another OTP',
            retryAfter: remainingTime
          });
          return;
        }
      }

      // Check daily limit (max 5 OTPs per day)
      const todayOTPCount = await this.emailVerificationService.getOTPCountToday(user.email);

      if (todayOTPCount >= 5) {
        res.status(429).json({ 
          error: 'Daily OTP limit reached. Please try again tomorrow.',
          dailyLimit: 5
        });
        return;
      }

      // Generate and send OTP
      const result = await this.emailVerificationService.sendVerificationOTP(
        user.email,
        user.name || 'User'
      );

      if (result.success) {
        await createAuditLog({
          userId: user.id,
          action: AuditAction.EMAIL_SENT,
          description: 'Email verification OTP resent',
          metadata: {
            email: user.email,
            purpose: 'email_verification_resend',
            attempt: todayOTPCount + 1,
            resourceType: 'email_verification',
            resourceId: user.email
          }
        });

        res.status(200).json({
          success: true,
          message: 'Verification OTP resent successfully',
          email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          remainingAttempts: 5 - (todayOTPCount + 1)
        });
      } else {
        res.status(500).json({
          error: 'Failed to resend verification OTP',
          details: result.error
        });
      }

    } catch (error: any) {
      console.error('Error in resendVerificationOTP:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Admin: Get verification status of any user
   * GET /api/auth/verification-status/:userId
   */
  async getUserVerificationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId } = req.params;

      if (!adminUserId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if there's a pending OTP
      const pendingInfo = await this.emailVerificationService.hasPendingOTP(user.email);

      // Create audit log for admin access
      await createAuditLog({
        userId: adminUserId,
        action: AuditAction.USER_STATUS_CHANGED,
        description: 'Admin viewed user email verification status',
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          adminAction: 'view_verification_status',
          resourceType: 'email_verification_status',
          resourceId: userId
        }
      });

      res.status(200).json({
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        pendingOTP: pendingInfo.hasPending,
        otpExpiresAt: pendingInfo.expiresAt || null,
        lastOTPSent: pendingInfo.createdAt || null,
        userCreatedAt: user.createdAt,
        lastUpdated: user.updatedAt
      });

    } catch (error: any) {
      console.error('Error in getUserVerificationStatus:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Admin: Manually verify a user's email
   * POST /api/auth/admin-verify-email/:userId
   */
  async adminVerifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!adminUserId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Update user's email verification status
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
      });

      // Create audit log for admin action
      await createAuditLog({
        userId: adminUserId,
        action: AuditAction.USER_STATUS_CHANGED,
        description: 'Admin manually verified user email',
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          adminVerification: true,
          adminReason: reason || 'Manual admin verification',
          verifiedAt: new Date().toISOString(),
          resourceType: 'email_verification',
          resourceId: user.email
        }
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully by admin',
        userId: user.id,
        email: user.email,
        emailVerified: true
      });

    } catch (error: any) {
      console.error('Error in adminVerifyEmail:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
