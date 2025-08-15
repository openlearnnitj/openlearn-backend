import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { PasswordResetOTPEmailService } from '../services/email/PasswordResetOTPEmailService';
import { AuditAction, UserRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Simple audit logging function (inline)
 */
async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Email Verification Controller
 * Handles email verification via OTP system
 */
export class EmailVerificationController {
  private otpEmailService: PasswordResetOTPEmailService;

  constructor() {
    this.otpEmailService = new PasswordResetOTPEmailService();
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
      const existingOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - 60000) } // 60 seconds ago
        }
      });

      if (existingOTP) {
        res.status(429).json({ 
          error: 'OTP recently sent. Please wait before requesting another.',
          retryAfter: 60
        });
        return;
      }

      // Generate and send OTP using the password reset service
      const result = await this.otpEmailService.sendPasswordResetOTP(
        user.email,
        user.name || 'User'
      );

      if (result.success) {
        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          resourceType: 'email_verification',
          resourceId: user.email,
          details: {
            email: user.email,
            purpose: 'email_verification'
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

      // Verify OTP using the password reset service
      const verificationResult = await this.otpEmailService.verifyPasswordResetOTP(user.email, otp);

      if (verificationResult.valid) {
        // Mark email as verified
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true }
        });

        // Create audit log
        await createAuditLog({
          userId: user.id,
          action: AuditAction.USER_UPDATED,
          resourceType: 'email_verification',
          resourceId: user.email,
          details: {
            email: user.email,
            verifiedAt: new Date().toISOString(),
            action: 'email_verified'
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
          action: AuditAction.PASSWORD_RESET_FAILED,
          resourceType: 'email_verification',
          resourceId: user.email,
          details: {
            email: user.email,
            reason: verificationResult.error || 'Invalid OTP',
            attemptedAt: new Date().toISOString()
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
      const pendingOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: userId,
          expiresAt: { gt: new Date() }
        },
        select: {
          expiresAt: true,
          createdAt: true
        }
      });

      res.status(200).json({
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        emailVerified: user.emailVerified,
        pendingOTP: !!pendingOTP,
        otpExpiresAt: pendingOTP?.expiresAt || null,
        lastOTPSent: pendingOTP?.createdAt || null
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
      const recentOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - 180000) } // 3 minutes ago
        }
      });

      if (recentOTP) {
        const remainingTime = Math.ceil((recentOTP.createdAt.getTime() + 180000 - Date.now()) / 1000);
        res.status(429).json({ 
          error: 'Please wait before requesting another OTP',
          retryAfter: remainingTime
        });
        return;
      }

      // Check daily limit (max 5 OTPs per day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayOTPCount = await prisma.passwordResetOTP.count({
        where: {
          userId: user.id,
          createdAt: { gte: todayStart }
        }
      });

      if (todayOTPCount >= 5) {
        res.status(429).json({ 
          error: 'Daily OTP limit reached. Please try again tomorrow.',
          dailyLimit: 5
        });
        return;
      }

      // Generate and send OTP
      const result = await this.otpEmailService.sendPasswordResetOTP(
        user.email,
        user.name || 'User'
      );

      if (result.success) {
        await createAuditLog({
          userId: user.id,
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          resourceType: 'email_verification',
          resourceId: user.email,
          details: {
            email: user.email,
            purpose: 'email_verification_resend',
            attempt: todayOTPCount + 1
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
      const pendingOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: userId,
          expiresAt: { gt: new Date() }
        },
        select: {
          expiresAt: true,
          createdAt: true
        }
      });

      // Create audit log for admin access
      await createAuditLog({
        userId: adminUserId,
        action: AuditAction.USER_VIEWED,
        resourceType: 'email_verification_status',
        resourceId: userId,
        details: {
          targetUserId: userId,
          targetUserEmail: user.email,
          adminAction: 'view_verification_status'
        }
      });

      res.status(200).json({
        userId: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        pendingOTP: !!pendingOTP,
        otpExpiresAt: pendingOTP?.expiresAt || null,
        lastOTPSent: pendingOTP?.createdAt || null,
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
        action: AuditAction.USER_UPDATED,
        resourceType: 'email_verification',
        resourceId: user.email,
        details: {
          targetUserId: userId,
          targetUserEmail: user.email,
          adminVerification: true,
          adminReason: reason || 'Manual admin verification',
          verifiedAt: new Date().toISOString()
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
