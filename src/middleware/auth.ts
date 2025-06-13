import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { JWTUtils } from '../utils/jwt';
import { AuthService } from '../services/authService';
import { TokenPayload } from '../types';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Access token is required',
        });
        return;
      }

      const tokenPayload = JWTUtils.verifyAccessToken(token);
      if (!tokenPayload) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
        });
        return;
      }

      // Verify user still exists and is not suspended
      const user = await AuthService.getUserById(tokenPayload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          error: 'Account is suspended',
        });
        return;
      }

      // Attach user to request
      req.user = tokenPayload;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during authentication',
      });
    }
  }

  /**
   * Check if user has required role(s)
   */
  static requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
        return;
      }

      next();
    };
  }

  /**
   * Check if user is active (not pending)
   */
  static async requireActiveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (user.status === 'PENDING') {
        res.status(403).json({
          success: false,
          error: 'Account pending approval. Please wait for admin approval.',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Active user check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

      if (token) {
        const tokenPayload = JWTUtils.verifyAccessToken(token);
        if (tokenPayload) {
          const user = await AuthService.getUserById(tokenPayload.userId);
          if (user && user.status !== 'SUSPENDED') {
            req.user = tokenPayload;
          }
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth error:', error);
      next(); // Continue without authentication
    }
  }
}

// Export convenient middleware functions
export const authMiddleware = AuthMiddleware.authenticate;
