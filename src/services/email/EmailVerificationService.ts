import { prisma } from '../../config/database';
import { EmailTemplateService } from './EmailTemplateService';
import { EmailService } from './EmailService';

export interface EmailVerificationResult {
  success: boolean;
  error?: string;
  data?: {
    otp?: string;
    expiresAt?: Date;
  };
}

/**
 * Email Verification Service
 * Handles email verification via OTP using the proper email service architecture
 */
export class EmailVerificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate and send email verification OTP
   */
  async sendVerificationOTP(email: string, userName: string): Promise<EmailVerificationResult> {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Delete any existing OTPs for this user
      await prisma.passwordResetOTP.deleteMany({
        where: { userId: user.id }
      });

      // Create new OTP record
      await prisma.passwordResetOTP.create({
        data: {
          id: `otp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          userId: user.id,
          otp: otp, // In production, this should be hashed
          expiresAt
        }
      });

      // Prepare template data
      const templateData = {
        userName: userName || 'User',
        otp: otp,
        expiryTime: expiresAt.toLocaleString(),
        expiryMinutes: 15
      };

      // Send email using the proper email service
      const compiledTemplate = await EmailTemplateService.compileTemplate('email-verification', templateData);
      
      const emailResult = await this.emailService.sendEmail({
        recipients: [{
          id: user.id,
          email: email,
          name: userName || 'User'
        }],
        subject: compiledTemplate.subject,
        htmlContent: compiledTemplate.htmlContent,
        textContent: compiledTemplate.textContent,
        templateData,
        priority: 1
      }, user.id);

      if (emailResult.success) {
        return {
          success: true,
          data: {
            otp, // Remove this in production for security
            expiresAt
          }
        };
      } else {
        return {
          success: false,
          error: emailResult.error || 'Failed to send verification email'
        };
      }

    } catch (error: any) {
      console.error('Error in sendVerificationOTP:', error);
      return {
        success: false,
        error: 'Failed to send verification OTP'
      };
    }
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOTP(email: string, otp: string): Promise<EmailVerificationResult> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Find valid OTP
      const otpRecord = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          otp: otp, // In production, compare hashed values
          expiresAt: { gt: new Date() }
        }
      });

      if (!otpRecord) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }

      // Delete the used OTP
      await prisma.passwordResetOTP.delete({
        where: { id: otpRecord.id }
      });

      return {
        success: true
      };

    } catch (error: any) {
      console.error('Error in verifyEmailOTP:', error);
      return {
        success: false,
        error: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Check if there's a pending OTP for a user
   */
  async hasPendingOTP(email: string): Promise<{
    hasPending: boolean;
    expiresAt?: Date;
    createdAt?: Date;
  }> {
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
          expiresAt: { gt: new Date() }
        },
        select: {
          expiresAt: true,
          createdAt: true
        }
      });

      return {
        hasPending: !!pendingOTP,
        expiresAt: pendingOTP?.expiresAt,
        createdAt: pendingOTP?.createdAt
      };

    } catch (error: any) {
      console.error('Error checking pending OTP:', error);
      return { hasPending: false };
    }
  }

  /**
   * Count OTPs sent today for rate limiting
   */
  async getOTPCountToday(email: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
      });

      if (!user) {
        return 0;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      return await prisma.passwordResetOTP.count({
        where: {
          userId: user.id,
          createdAt: { gte: todayStart }
        }
      });

    } catch (error: any) {
      console.error('Error getting OTP count:', error);
      return 0;
    }
  }
}
