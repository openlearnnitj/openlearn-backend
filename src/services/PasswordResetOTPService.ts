import * as crypto from 'crypto';
import { prisma } from '../config/database';
import { PasswordResetOTP, User } from '@prisma/client';
import { PasswordUtils } from '../utils/password';
import { ValidationUtils } from '../utils/validation';

export interface PasswordResetOTPRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OTPVerificationRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  ipAddress?: string;
}

export interface OTPValidationRequest {
  email: string;
  otp: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Service for handling OTP-based password reset functionality
 * Implements secure OTP generation, validation, and cleanup
 */
export class PasswordResetOTPService {
  
  // OTP expiration time: 10 minutes
  private static readonly OTP_EXPIRY_MINUTES = 10;
  
  // Maximum reset attempts per email per hour
  private static readonly MAX_RESET_ATTEMPTS_PER_HOUR = 3;
  
  // Maximum OTP verification attempts
  private static readonly MAX_OTP_ATTEMPTS = 5;
  
  /**
   * Generate and send OTP for password reset
   */
  static async requestPasswordReset(request: PasswordResetOTPRequest): Promise<PasswordResetResult> {
    try {
      // Validate email format
      if (!ValidationUtils.isValidEmail(request.email)) {
        return {
          success: false,
          message: 'Invalid email format',
          error: 'INVALID_EMAIL_FORMAT'
        };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: request.email.toLowerCase() }
      });

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return {
          success: true,
          message: 'If an account with that email exists, a verification code has been sent.',
          data: { emailSent: false }
        };
      }

      // Check rate limiting and create OTP atomically to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        // Check rate limiting: max 3 requests per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOTPCount = await tx.passwordResetOTP.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: oneHourAgo
            }
          }
        });

        if (recentOTPCount >= this.MAX_RESET_ATTEMPTS_PER_HOUR) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }

        // Generate secure 6-digit OTP
        const otp = this.generateSecureOTP();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // Store OTP in database
        const resetOTP = await tx.passwordResetOTP.create({
          data: {
            otp,
            userId: user.id,
            expiresAt,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent
          }
        });

        return resetOTP;
      });

      // Clean up expired and used OTPs after successful creation (outside transaction)
      await this.cleanupInvalidOTPs(user.id);

      return {
        success: true,
        message: 'A verification code has been sent to your email.',
        data: { 
          otp: result.otp, // Only for testing/development - remove in production
          expiresAt: result.expiresAt,
          emailSent: true,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          expiryMinutes: this.OTP_EXPIRY_MINUTES
        }
      };

    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return {
          success: false,
          message: 'Too many password reset requests. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }

      console.error('OTP password reset request error:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again.',
        error: 'INTERNAL_SERVER_ERROR'
      };
    }
  }

  /**
   * Validate OTP without resetting password (for frontend validation)
   */
  static async validateOTP(request: OTPValidationRequest): Promise<PasswordResetResult> {
    try {
      if (!request.email || !request.otp) {
        return {
          success: false,
          message: 'Email and verification code are required.',
          error: 'MISSING_REQUIRED_FIELDS'
        };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: request.email.toLowerCase() }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid verification code.',
          error: 'INVALID_OTP'
        };
      }

      // Find valid OTP
      const otpRecord = await prisma.passwordResetOTP.findFirst({
        where: {
          userId: user.id,
          otp: request.otp,
          expiresAt: { gte: new Date() },
          usedAt: null
        }
      });

      if (!otpRecord) {
        // Increment attempts for all matching OTPs (even if they don't exist in this query)
        await prisma.passwordResetOTP.updateMany({
          where: {
            userId: user.id,
            otp: request.otp,
            expiresAt: { gte: new Date() },
            usedAt: null
          },
          data: {
            attempts: { increment: 1 }
          }
        });

        return {
          success: false,
          message: 'Invalid or expired verification code.',
          error: 'INVALID_OTP'
        };
      }

      // Check if OTP has exceeded maximum attempts
      if (otpRecord.attempts >= this.MAX_OTP_ATTEMPTS) {
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.',
          error: 'MAX_ATTEMPTS_EXCEEDED'
        };
      }

      return {
        success: true,
        message: 'Verification code is valid.',
        data: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          expiresAt: otpRecord.expiresAt,
          attemptsRemaining: this.MAX_OTP_ATTEMPTS - otpRecord.attempts
        }
      };

    } catch (error) {
      console.error('OTP validation error:', error);
      return {
        success: false,
        message: 'An error occurred while validating the code.',
        error: 'INTERNAL_SERVER_ERROR'
      };
    }
  }

  /**
   * Verify OTP and reset password
   */
  static async verifyOTPAndResetPassword(verification: OTPVerificationRequest): Promise<PasswordResetResult> {
    try {
      // Validate input
      if (!verification.email || !verification.otp || !verification.newPassword || !verification.confirmPassword) {
        return {
          success: false,
          message: 'All fields are required.',
          error: 'MISSING_REQUIRED_FIELDS'
        };
      }

      // Check if passwords match
      if (verification.newPassword !== verification.confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match.',
          error: 'PASSWORDS_DO_NOT_MATCH'
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePassword(verification.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', '),
          error: 'WEAK_PASSWORD'
        };
      }

      // Validate OTP first
      const otpValidation = await this.validateOTP({
        email: verification.email,
        otp: verification.otp
      });

      if (!otpValidation.success) {
        return otpValidation;
      }

      const user = await prisma.user.findUnique({
        where: { email: verification.email.toLowerCase() }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
          error: 'USER_NOT_FOUND'
        };
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hashPassword(verification.newPassword);

      // Use transaction to update password and mark OTP as used
      const result = await prisma.$transaction(async (tx) => {
        // Update user password
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
          select: { id: true, email: true, name: true }
        });

        // Mark OTP as used
        await tx.passwordResetOTP.updateMany({
          where: {
            userId: user.id,
            otp: verification.otp,
            expiresAt: { gte: new Date() },
            usedAt: null
          },
          data: { usedAt: new Date() }
        });

        return updatedUser;
      });

      // Clean up any other unused OTPs for this user
      await this.cleanupExpiredOTPs(user.id);

      return {
        success: true,
        message: 'Password has been reset successfully.',
        data: {
          userId: result.id,
          email: result.email,
          name: result.name
        }
      };

    } catch (error) {
      console.error('OTP password reset error:', error);
      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
        error: 'INTERNAL_SERVER_ERROR'
      };
    }
  }

  /**
   * Clean up expired or used OTPs for a user
   */
  static async cleanupExpiredOTPs(userId?: string): Promise<void> {
    try {
      const whereClause: any = {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expired OTPs
          { usedAt: { not: null } }, // Used OTPs
          { attempts: { gte: this.MAX_OTP_ATTEMPTS } } // OTPs with too many failed attempts
        ]
      };

      if (userId) {
        whereClause.userId = userId;
      }

      await prisma.passwordResetOTP.deleteMany({
        where: whereClause
      });

    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  }

  /**
   * Clean up ONLY expired and used OTPs for a user (preserve failed attempts for rate limiting)
   */
  static async cleanupInvalidOTPs(userId?: string): Promise<void> {
    try {
      const whereClause: any = {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expired OTPs
          { usedAt: { not: null } }, // Used OTPs
          // NOTE: Don't clean up OTPs with too many attempts as they should count for rate limiting
        ]
      };

      if (userId) {
        whereClause.userId = userId;
      }

      await prisma.passwordResetOTP.deleteMany({
        where: whereClause
      });

    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  }

  /**
   * Get password reset statistics for monitoring
   */
  static async getResetStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    try {
      const timeMap = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeMap[timeframe]);

      const [totalRequests, successfulResets, expiredOTPs, activeOTPs] = await Promise.all([
        prisma.passwordResetOTP.count({
          where: { createdAt: { gte: since } }
        }),
        prisma.passwordResetOTP.count({
          where: {
            createdAt: { gte: since },
            usedAt: { not: null }
          }
        }),
        prisma.passwordResetOTP.count({
          where: {
            createdAt: { gte: since },
            expiresAt: { lt: new Date() },
            usedAt: null
          }
        }),
        prisma.passwordResetOTP.count({
          where: {
            createdAt: { gte: since },
            expiresAt: { gte: new Date() },
            usedAt: null,
            attempts: { lt: this.MAX_OTP_ATTEMPTS }
          }
        })
      ]);

      return {
        timeframe,
        since,
        totalRequests,
        successfulResets,
        expiredOTPs,
        activeOTPs,
        successRate: totalRequests > 0 ? (successfulResets / totalRequests * 100).toFixed(2) : 0,
        maxAttempts: this.MAX_OTP_ATTEMPTS,
        expiryMinutes: this.OTP_EXPIRY_MINUTES
      };

    } catch (error) {
      console.error('Statistics error:', error);
      return null;
    }
  }

  /**
   * Generate a cryptographically secure 6-digit OTP
   */
  private static generateSecureOTP(): string {
    // Generate a secure random number between 100000 and 999999
    const buffer = crypto.randomBytes(4);
    const randomNumber = buffer.readUInt32BE(0);
    const otp = (randomNumber % 900000) + 100000;
    return otp.toString();
  }

  /**
   * Revoke all active OTPs for a user
   * Useful when user changes password through other means
   */
  static async revokeActiveOTPs(userId: string): Promise<void> {
    try {
      await prisma.passwordResetOTP.deleteMany({
        where: {
          userId,
          expiresAt: { gte: new Date() },
          usedAt: null
        }
      });
    } catch (error) {
      console.error('OTP revocation error:', error);
    }
  }

  /**
   * Check if user has reached rate limit
   */
  static async checkRateLimit(email: string): Promise<{ allowed: boolean; remaining: number; resetTime?: Date }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return { allowed: true, remaining: this.MAX_RESET_ATTEMPTS_PER_HOUR };
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentAttempts = await prisma.passwordResetOTP.count({
        where: {
          userId: user.id,
          createdAt: { gte: oneHourAgo }
        }
      });

      const remaining = Math.max(0, this.MAX_RESET_ATTEMPTS_PER_HOUR - recentAttempts);
      const allowed = remaining > 0;

      return {
        allowed,
        remaining,
        resetTime: allowed ? undefined : new Date(Date.now() + 60 * 60 * 1000)
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: false, remaining: 0 };
    }
  }
}
