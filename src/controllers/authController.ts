import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { SignupRequest, LoginRequest, ApiResponse } from '../types';
import { prisma } from '../config/database';
import { ValidationUtils } from '../utils/validation';
import { PasswordUtils } from '../utils/password';

export class AuthController {
  /**
   * User signup
   */
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const signupData: SignupRequest = req.body;
      
      const result = await AuthService.signup(signupData);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'User registered successfully. Account is pending approval.',
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Signup controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      
      const result = await AuthService.login(loginData);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Login successful',
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Token refreshed successfully',
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Refresh token controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Remove password from response
      const { password, ...userProfile } = user;

      res.status(200).json({
        success: true,
        data: userProfile,
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Logout (client-side token removal)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a JWT-based system, logout is typically handled client-side
      // by removing the token. Here we just return a success message.
      res.status(200).json({
        success: true,
        message: 'Logout successful. Please remove tokens from client storage.',
      });
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { name, twitterHandle, linkedinUrl, githubUsername, kaggleUsername } = req.body;
      const currentUser = req.user;

      // Validate name if provided
      if (name && (name.length < 2 || name.length > 50)) {
        res.status(400).json({
          success: false,
          error: 'Name must be between 2 and 50 characters',
        });
        return;
      }

      // Build update data object
      const updateData: any = {};
      if (name !== undefined) updateData.name = ValidationUtils.sanitizeString(name);
      if (twitterHandle !== undefined) updateData.twitterHandle = twitterHandle ? ValidationUtils.sanitizeString(twitterHandle) : null;
      if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl ? ValidationUtils.sanitizeString(linkedinUrl) : null;
      if (githubUsername !== undefined) updateData.githubUsername = githubUsername ? ValidationUtils.sanitizeString(githubUsername) : null;
      if (kaggleUsername !== undefined) updateData.kaggleUsername = kaggleUsername ? ValidationUtils.sanitizeString(kaggleUsername) : null;

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: currentUser.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          twitterHandle: true,
          linkedinUrl: true,
          githubUsername: true,
          kaggleUsername: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const currentUser = req.user;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
        return;
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: passwordValidation.errors.join(', '),
        });
        return;
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      // Hash new password
      const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);

      // Update password and revoke any active password reset tokens
      await prisma.user.update({
        where: { id: currentUser.userId },
        data: { password: hashedNewPassword },
      });


      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_PASSWORD_CHANGED',
          description: 'User changed their password',
          metadata: {
            userId: currentUser.userId,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
