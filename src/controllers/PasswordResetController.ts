import { Request, Response } from 'express';
import { PasswordResetService } from '../services/email/PasswordResetService';
import { getClientInfo } from '../utils/requestUtils';

/**
 * Password Reset Controller
 * Handles OTP-based password reset flow
 */
export class PasswordResetController {
  private static passwordResetService = new PasswordResetService();

  /**
   * Send password reset OTP to user's email
   * POST /api/auth/password-reset/send-otp
   */
  static async sendPasswordResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Validate input
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
        return;
      }

      // Get client info for security tracking
      const { ipAddress, userAgent } = getClientInfo(req);

      // Send OTP
      const result = await PasswordResetController.passwordResetService.sendPasswordResetOTP(
        email.toLowerCase().trim(),
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'If an account exists with this email, you will receive a password reset OTP shortly.',
          data: {
            expiresAt: result.data?.expiresAt
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to send password reset OTP'
        });
      }

    } catch (error: any) {
      console.error('Error in sendPasswordResetOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  /**
   * Verify password reset OTP
   * POST /api/auth/password-reset/verify-otp
   */
  static async verifyPasswordResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      // Validate input
      if (!email || !otp) {
        res.status(400).json({
          success: false,
          error: 'Email and OTP are required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
        return;
      }

      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({
          success: false,
          error: 'OTP must be exactly 6 digits'
        });
        return;
      }

      // Get client info for security tracking
      const { ipAddress } = getClientInfo(req);

      // Verify OTP
      const result = await PasswordResetController.passwordResetService.verifyPasswordResetOTP(
        email.toLowerCase().trim(),
        otp,
        ipAddress
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'OTP verified successfully. You can now reset your password.',
          data: {
            expiresAt: result.data?.expiresAt
          }
        });
      } else {
        const statusCode = result.error?.includes('max attempts') || result.error?.includes('expired') ? 410 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error || 'OTP verification failed',
          data: result.data
        });
      }

    } catch (error: any) {
      console.error('Error in verifyPasswordResetOTP:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  /**
   * Reset password using verified OTP
   * POST /api/auth/password-reset/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, newPassword } = req.body;

      // Validate input
      if (!email || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Email, OTP, and new password are required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
        return;
      }

      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({
          success: false,
          error: 'OTP must be exactly 6 digits'
        });
        return;
      }

      // Validate password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
        return;
      }

      // Additional password validation (optional - you can customize this)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        res.status(400).json({
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
        return;
      }

      // Get client info for security tracking
      const { ipAddress } = getClientInfo(req);

      // Reset password
      const result = await PasswordResetController.passwordResetService.resetPassword(
        email.toLowerCase().trim(),
        otp,
        newPassword,
        ipAddress
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Password has been reset successfully. You can now login with your new password.'
        });
      } else {
        const statusCode = result.error?.includes('max attempts') || result.error?.includes('expired') ? 410 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Password reset failed'
        });
      }

    } catch (error: any) {
      console.error('Error in resetPassword:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  /**
   * Check if user has pending OTP (for frontend to know if they can show verify form)
   * GET /api/auth/password-reset/status?email=user@example.com
   */
  static async getPasswordResetStatus(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Email query parameter is required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
        return;
      }

      const status = await PasswordResetController.passwordResetService.hasPendingOTP(
        email.toLowerCase().trim()
      );

      res.status(200).json({
        success: true,
        data: {
          hasPendingOTP: status.hasPending,
          createdAt: status.createdAt,
          expiresAt: status.expiresAt
        }
      });

    } catch (error: any) {
      console.error('Error in getPasswordResetStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }
}

export default PasswordResetController;
