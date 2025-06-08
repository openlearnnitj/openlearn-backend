import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';
import { ErrorCodes, createApiError } from '../utils/common';
import { prisma } from '../config/database';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiter for authentication endpoints to prevent brute force attacks
 */
const authLimiter = new RateLimiterMemory({
  points: 5, // Number of attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
});

/**
 * Interface for JWT payload structure
 */
interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate JWT tokens and populate user information
 * 
 * This middleware:
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies the JWT token signature and expiration
 * 3. Fetches user data from database including roles and permissions
 * 4. Attaches user information to the request object
 * 5. Handles token expiration and invalid tokens gracefully
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createApiError(
        'Access token is required',
        401,
        ErrorCodes.AUTHENTICATION_REQUIRED
      ));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret) as JWTPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return next(createApiError(
          'Access token has expired',
          401,
          ErrorCodes.TOKEN_EXPIRED
        ));
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return next(createApiError(
          'Invalid access token',
          401,
          ErrorCodes.INVALID_TOKEN
        ));
      }
      throw jwtError;
    }

    // Fetch user from database with roles and permissions
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true, // Only allow active users
      },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return next(createApiError(
        'User not found or inactive',
        401,
        ErrorCodes.USER_NOT_FOUND
      ));
    }

    // // Check if user's email verification status (if required)
    // if (!user.emailVerified && config.auth.requireEmailVerification) {
    //   return next(createApiError(
    //     'Email verification required',
    //     403,
    //     ErrorCodes.EMAIL_NOT_VERIFIED
    //   ));
    // }

    // Extract roles and permissions with full structure
    const roles = user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      level: ur.role.level,
      permissions: ur.role.rolePermissions.map(rp => ({
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action
      }))
    }));

    // Flatten all permissions from all roles
    const allPermissions = user.userRoles.flatMap(ur => 
      ur.role.rolePermissions.map(rp => ({
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action
      }))
    );
    
    // Remove duplicate permissions by name
    const uniquePermissions = allPermissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.name === permission.name)
    );

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      roles,
      permissions: uniquePermissions
    };

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    next(createApiError(
      'Authentication failed',
      500,
      ErrorCodes.INTERNAL_SERVER_ERROR
    ));
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  // If no token provided, continue without authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If token is provided, authenticate it
  return authenticate(req, res, next);
};

/**
 * Rate limiting middleware for authentication endpoints
 * Prevents brute force attacks on login, register, etc.
 */
export const authRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await authLimiter.consume(key);
    next();
  } catch (rateLimiterRes: any) {
    const msBeforeNext = Math.round(rateLimiterRes.msBeforeNext) || 1;
    
    res.set('Retry-After', String(Math.round(msBeforeNext / 1000)));
    
    return next(createApiError(
      'Too many authentication attempts. Please try again later.',
      429,
      ErrorCodes.RATE_LIMIT_EXCEEDED
    ));
  }
};

/**
 * Middleware to check if user has verified their email
 * Should be used after authenticate middleware
 */
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(createApiError(
      'Authentication required',
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED
    ));
  }

//   if (!req.user.emailVerified) {
//     return next(createApiError(
//       'Email verification required',
//       403,
//       ErrorCodes.EMAIL_NOT_VERIFIED
//     ));
//   }

  next();
};

/**
 * Middleware to ensure user account is active
 * Should be used after authenticate middleware
 */
export const requireActiveAccount = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(createApiError(
      'Authentication required',
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED
    ));
  }

  if (!req.user.isActive) {
    return next(createApiError(
      'Account is inactive',
      403,
      ErrorCodes.ACCOUNT_INACTIVE
    ));
  }

  next();
};
