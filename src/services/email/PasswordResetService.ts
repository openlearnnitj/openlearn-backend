import { prisma } from '../../config/database';
import { EmailTemplateService } from './EmailTemplateService';
import { EmailService } from './EmailService';
import bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  data?: {
    otp?: string;
    expiresAt?: Date;
    attemptsRemaining?: number;
  };
}

/**
 * Password Reset Service
 * Handles password reset via OTP using the proper email service architecture
 */
export class PasswordResetService {
  private emailService: EmailService;
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_MINUTES = 2; // Min wait between OTP requests

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate and send password reset OTP
   */
  async sendPasswordResetOTP(email: string, ipAddress?: string, userAgent?: string): Promise<PasswordResetResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, email: true, status: true }
      });

      if (!user) {
        // For security, don't reveal if email exists or not
        return {
          success: true,
          data: {
            expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000)
          }
        };
      }

      // Check if user account is active
      if (user.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Account is not active. Please contact support.'
        };
      }

      // Check rate limiting - only allow one OTP per rate limit period
      const existingOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          usedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingOTP) {
        const timeSinceLastOTP = Date.now() - existingOTP.createdAt.getTime();
        const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;
        
        if (timeSinceLastOTP < rateLimitMs) {
          const waitTime = Math.ceil((rateLimitMs - timeSinceLastOTP) / 1000);
          return {
            success: false,
            error: `Please wait ${waitTime} seconds before requesting another OTP.`
          };
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
      
      // Delete any existing OTPs for this user
      await prisma.passwordResetOTP.deleteMany({
        where: { userId: user.id }
      });

      // Create new OTP record
      await prisma.passwordResetOTP.create({
        data: {
          userId: user.id,
          otp: await bcrypt.hash(otp, 10), // Hash the OTP for security
          expiresAt,
          ipAddress,
          userAgent
        }
      });

      // Create audit log
      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        description: 'Password reset OTP sent',
        metadata: {
          email: user.email,
          ipAddress,
          userAgent,
          expiresAt: expiresAt.toISOString()
        }
      });

      // Prepare template data for password-reset-otp template
      const requestTime = new Date().toLocaleString();
      const templateData = {
        userName: user.name || 'User',
        userEmail: user.email,
        otp: otp,
        expiryTime: expiresAt.toLocaleString(),
        expiryMinutes: this.OTP_EXPIRY_MINUTES,
        requestTime: requestTime,
        ipAddress: ipAddress || 'Unknown',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@openlearn.org.in'
      };

      // Send email using the proper email service with OTP template
      const compiledTemplate = await EmailTemplateService.compileTemplate('password-reset-otp', templateData);
      
      const emailResult = await this.emailService.sendEmail({
        recipients: [{
          id: user.id,
          email: user.email,
          name: user.name || 'User'
        }],
        subject: compiledTemplate.subject,
        htmlContent: compiledTemplate.htmlContent,
        textContent: compiledTemplate.textContent,
        priority: 1 // High priority
      }, 'SYSTEM');

      if (!emailResult.success) {
        return {
          success: false,
          error: 'Failed to send password reset email. Please try again.'
        };
      }

      return {
        success: true,
        data: {
          expiresAt
        }
      };

    } catch (error: any) {
      console.error('Error in sendPasswordResetOTP:', error);
      return {
        success: false,
        error: 'Internal server error. Please try again later.'
      };
    }
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordResetOTP(email: string, otp: string, ipAddress?: string): Promise<PasswordResetResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid OTP or OTP has expired.'
        };
      }

      // Find active OTP
      const otpRecord = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          usedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid OTP or OTP has expired.'
        };
      }

      // Check max attempts
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        // Delete the OTP after max attempts
        await prisma.passwordResetOTP.delete({
          where: { id: otpRecord.id }
        });

        await this.createAuditLog({
          userId: user.id,
          action: AuditAction.PASSWORD_RESET_FAILED,
          description: 'Password reset OTP failed - max attempts exceeded',
          metadata: {
            email: user.email,
            ipAddress,
            attempts: otpRecord.attempts
          }
        });

        return {
          success: false,
          error: 'Too many invalid attempts. Please request a new OTP.'
        };
      }

      // Verify OTP
      const isValidOTP = await bcrypt.compare(otp, otpRecord.otp);

      if (!isValidOTP) {
        // Increment attempts
        await prisma.passwordResetOTP.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 }
        });

        const attemptsRemaining = this.MAX_ATTEMPTS - (otpRecord.attempts + 1);

        await this.createAuditLog({
          userId: user.id,
          action: AuditAction.PASSWORD_RESET_FAILED,
          description: 'Password reset OTP verification failed',
          metadata: {
            email: user.email,
            ipAddress,
            attempts: otpRecord.attempts + 1,
            attemptsRemaining
          }
        });

        return {
          success: false,
          error: 'Invalid OTP.',
          data: {
            attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0
          }
        };
      }

      // Mark OTP as used
      await prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() }
      });

      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_OTP_VERIFIED,
        description: 'Password reset OTP verified successfully',
        metadata: {
          email: user.email,
          ipAddress
        }
      });

      return {
        success: true,
        data: {
          expiresAt: otpRecord.expiresAt
        }
      };

    } catch (error: any) {
      console.error('Error in verifyPasswordResetOTP:', error);
      return {
        success: false,
        error: 'Internal server error. Please try again later.'
      };
    }
  }

  /**
   * Reset password after OTP verification
   */
  async resetPassword(email: string, otp: string, newPassword: string, ipAddress?: string): Promise<PasswordResetResult> {
    try {
      // First verify the OTP
      const verificationResult = await this.verifyPasswordResetOTP(email, otp, ipAddress);
      
      if (!verificationResult.success) {
        return verificationResult;
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found.'
        };
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long.'
        };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      // Delete all password reset OTPs for this user
      await prisma.passwordResetOTP.deleteMany({
        where: { userId: user.id }
      });

      // Create audit log
      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        description: 'Password reset completed successfully',
        metadata: {
          email: user.email,
          ipAddress
        }
      });

      // Send success notification email
      try {
        const resetTime = new Date().toLocaleString();
        const successTemplateData = {
          userName: user.name || 'User',
          userEmail: user.email,
          resetTime: resetTime,
          loginUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'https://openlearn.org.in/login',
          ipAddress: ipAddress || 'Unknown'
        };

        const successTemplate = await EmailTemplateService.compileTemplate('password-reset-success', successTemplateData);
        
        await this.emailService.sendEmail({
          recipients: [{
            id: user.id,
            email: user.email,
            name: user.name || 'User'
          }],
          subject: successTemplate.subject,
          htmlContent: successTemplate.htmlContent,
          textContent: successTemplate.textContent,
          priority: 1 // High priority
        }, 'SYSTEM');

      } catch (emailError) {
        console.error('Failed to send password reset success email:', emailError);
        // Don't fail the password reset if email fails
      }

      return {
        success: true
      };

    } catch (error: any) {
      console.error('Error in resetPassword:', error);
      return {
        success: false,
        error: 'Internal server error. Please try again later.'
      };
    }
  }

  /**
   * Check if user has a pending OTP
   */
  async hasPendingOTP(email: string): Promise<{ hasPending: boolean; createdAt?: Date; expiresAt?: Date }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return { hasPending: false };
      }

      const pendingOTP = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          usedAt: null
        },
        select: { createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' }
      });

      return {
        hasPending: !!pendingOTP,
        createdAt: pendingOTP?.createdAt,
        expiresAt: pendingOTP?.expiresAt
      };

    } catch (error) {
      console.error('Error in hasPendingOTP:', error);
      return { hasPending: false };
    }
  }

  /**
   * Create audit log helper
   */
  private async createAuditLog(data: {
    userId: string;
    action: AuditAction;
    description?: string;
    metadata?: any;
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
}

export default PasswordResetService;
