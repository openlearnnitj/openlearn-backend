import { Request, Response } from 'express';
import { PasswordResetOTPService } from '../services/PasswordResetOTPService';
import { PasswordResetOTPEmailService } from '../services/email/PasswordResetOTPEmailService';
import { ValidationUtils } from '../utils/validation';

/**
 * Controller for handling OTP-based password reset functionality
 * Provides endpoints for requesting OTP, validating OTP, and resetting password
 */
export class PasswordResetOTPController {

  /**
   * Request password reset OTP - Step 1
   * POST /auth/forgot-password
   */
  static async requestPasswordResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Basic validation
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        });
        return;
      }

      // Get client info for security tracking
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check rate limiting first
      const rateCheck = await PasswordResetOTPService.checkRateLimit(email);
      if (!rateCheck.allowed) {
        res.status(429).json({
          success: false,
          message: `Too many password reset requests. Please try again later.`,
          error: 'RATE_LIMIT_EXCEEDED',
          data: {
            remaining: rateCheck.remaining,
            resetTime: rateCheck.resetTime
          }
        });
        return;
      }

      // Request password reset OTP
      const result = await PasswordResetOTPService.requestPasswordReset({
        email,
        ipAddress,
        userAgent
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      // Send OTP email only if user exists and request was successful
      if (result.data?.emailSent && result.data?.otp) {
        const emailResult = await PasswordResetOTPEmailService.sendPasswordResetOTP({
          userName: result.data.userName,
          userEmail: result.data.userEmail,
          otp: result.data.otp,
          requestTime: new Date().toLocaleString(),
          expiryTime: result.data.expiresAt.toLocaleString(),
          expiryMinutes: result.data.expiryMinutes,
          ipAddress
        });

        if (!emailResult.success) {
          console.error('Failed to send password reset OTP email:', emailResult.error);
          // Don't fail the request if email fails, for security reasons
        }
      }

      // Always return success message for security
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiryMinutes: result.data?.expiryMinutes || 10,
          remainingAttempts: rateCheck.remaining - 1
        }
      });

    } catch (error) {
      console.error('Password reset OTP request error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Validate OTP without resetting password - Step 2
   * POST /auth/validate-reset-otp
   */
  static async validateResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({
          success: false,
          message: 'Email and verification code are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      const result = await PasswordResetOTPService.validateOTP({
        email,
        otp
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.data?.userId,
          userEmail: result.data?.userEmail,
          userName: result.data?.userName,
          expiresAt: result.data?.expiresAt,
          attemptsRemaining: result.data?.attemptsRemaining
        }
      });

    } catch (error) {
      console.error('OTP validation error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while validating the verification code',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Reset password with OTP - Step 3
   * POST /auth/reset-password-with-otp
   */
  static async resetPasswordWithOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;

      // Basic validation
      if (!email || !otp || !newPassword || !confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'All fields are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // Get client info for security tracking
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      // Reset password with OTP
      const result = await PasswordResetOTPService.verifyOTPAndResetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
        ipAddress
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      // Send confirmation email
      if (result.data?.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const loginUrl = `${frontendUrl}/login`;

        const emailResult = await PasswordResetOTPEmailService.sendPasswordResetSuccessEmail({
          userName: result.data.name || 'User',
          userEmail: result.data.email,
          loginUrl,
          resetTime: new Date().toLocaleString(),
          ipAddress
        });

        if (!emailResult.success) {
          console.error('Failed to send password reset confirmation email:', emailResult.error);
          // Don't fail the request if email fails
        }
      }

      res.status(200).json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Password reset with OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while resetting your password',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get password reset statistics (admin only)
   * GET /auth/password-reset/stats
   */
  static async getResetStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = 'day' } = req.query;

      if (!['hour', 'day', 'week'].includes(timeframe as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid timeframe. Use: hour, day, or week',
          error: 'INVALID_TIMEFRAME'
        });
        return;
      }

      const stats = await PasswordResetOTPService.getResetStatistics(timeframe as 'hour' | 'day' | 'week');

      if (!stats) {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve statistics',
          error: 'STATS_ERROR'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Password reset statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while retrieving statistics',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Test password reset OTP email templates
   * POST /auth/password-reset/test-otp-email
   */
  static async testResetOTPEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, templateType = 'otp' } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        });
        return;
      }

      if (!ValidationUtils.isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
          error: 'INVALID_EMAIL'
        });
        return;
      }

      if (!['otp', 'success'].includes(templateType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid template type. Use: otp or success',
          error: 'INVALID_TEMPLATE_TYPE'
        });
        return;
      }

      let result;
      if (templateType === 'otp') {
        result = await PasswordResetOTPEmailService.sendTestOTPEmail(email);
      } else {
        result = await PasswordResetOTPEmailService.sendTestSuccessEmail(email);
      }

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: 'Failed to send test email',
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Test ${templateType} email sent successfully to ${email}`
      });

    } catch (error) {
      console.error('Test OTP email error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while sending test email',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Check rate limiting for password reset requests
   * GET /auth/password-reset/rate-limit/:email
   */
  static async checkRateLimit(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        });
        return;
      }

      if (!ValidationUtils.isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
          error: 'INVALID_EMAIL'
        });
        return;
      }

      const rateCheck = await PasswordResetOTPService.checkRateLimit(email);

      res.status(200).json({
        success: true,
        data: {
          allowed: rateCheck.allowed,
          remaining: rateCheck.remaining,
          resetTime: rateCheck.resetTime
        }
      });

    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while checking rate limit',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}
