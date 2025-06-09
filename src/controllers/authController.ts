import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { SignupRequest, LoginRequest, ApiResponse } from '../types';

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
}
