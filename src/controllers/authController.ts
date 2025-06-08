import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AuthService } from '../services/authService';
import { RegisterDTO, LoginDTO } from '../types';
import { createApiError, ErrorCodes, Logger } from '../utils/common';
import { ValidationUtils, PasswordUtils } from '../utils/auth';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  constructor() {
    // No instance needed since AuthService uses static methods
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registerData: RegisterDTO = {
        email: req.body.email,
        password: req.body.password,
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        studentId: req.body.studentId,
        role: req.body.role || 'PIONEER'
      };

      // Validate student ID format if provided
      if (registerData.studentId && !ValidationUtils.isValidStudentId(registerData.studentId)) {
        throw createApiError(
          'Invalid student ID format',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const result = await AuthService.register(
        registerData,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      Logger.info(`New user registration: ${registerData.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginData: LoginDTO = {
        email: req.body.email,
        password: req.body.password
      };

      const result = await AuthService.login(
        loginData,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      Logger.info(`User login: ${loginData.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw createApiError(
          'Refresh token is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const result = await AuthService.refreshToken(
        refreshToken
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user (invalidate refresh token)
   * POST /api/auth/logout
   */
  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      Logger.info(`User logout: ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw createApiError(
          'Email is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!ValidationUtils.isValidEmail(email)) {
        throw createApiError(
          'Invalid email format',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      await AuthService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw createApiError(
          'Token and new password are required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.isValid) {
        throw createApiError(
          `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      await AuthService.resetPassword(token, newPassword);

      Logger.info('Password reset completed successfully');

      res.json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Change password for authenticated user
   * POST /api/auth/change-password
   */
  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw createApiError(
          'Authentication required',
          401,
          ErrorCodes.AUTHENTICATION_REQUIRED
        );
      }

      if (!currentPassword || !newPassword) {
        throw createApiError(
          'Current password and new password are required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.isValid) {
        throw createApiError(
          `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      await AuthService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      Logger.info(`Password changed for user: ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email address
   * POST /api/auth/verify-email
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw createApiError(
          'Verification token is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      await AuthService.verifyEmail(token);

      Logger.info('Email verification completed successfully');

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Resend email verification
   * POST /api/auth/resend-verification
   */
  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw createApiError(
          'Email is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!ValidationUtils.isValidEmail(email)) {
        throw createApiError(
          'Invalid email format',
          400,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      await AuthService.resendEmailVerification(email);

      res.json({
        success: true,
        message: 'Verification email sent if account exists'
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw createApiError(
          'Authentication required',
          401,
          ErrorCodes.AUTHENTICATION_REQUIRED
        );
      }

      const user = await AuthService.getUserProfile(userId);

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw createApiError(
          'Authentication required',
          401,
          ErrorCodes.AUTHENTICATION_REQUIRED
        );
      }

      const updateData = {
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        bio: req.body.bio,
        avatar: req.body.avatar,
        linkedinProfile: req.body.linkedinProfile,
        githubProfile: req.body.githubProfile
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const updatedUser = await AuthService.updateUserProfile(userId, updateData);

      Logger.info(`Profile updated for user: ${req.user?.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });

    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user activity/audit logs
   * GET /api/auth/activity
   */
  getUserActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw createApiError(
          'Authentication required',
          401,
          ErrorCodes.AUTHENTICATION_REQUIRED
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const activity = await AuthService.getUserActivity(userId, page, limit);

      res.json({
        success: true,
        data: activity
      });

    } catch (error) {
      next(error);
    }
  };
}

// Export a singleton instance
export const authController = new AuthController();
