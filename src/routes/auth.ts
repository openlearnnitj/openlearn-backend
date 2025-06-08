import { Router } from 'express';
import { authController } from '../controllers/authController';
import {
  // Basic middleware
  requestLogger,
  securityHeaders,
  corsHandler,
  sanitizeInput,
  generalRateLimit,
  authRateLimit,
  
  // Auth middleware
  authenticate,
  requireActiveAccount,
  
  // Validation middleware
  authValidations,
  userValidations,
  
  // Middleware combinations
  protectedRoute,
  verifiedRoute
} from '../middleware';

const authRouter = Router();

// Apply base middleware to all auth routes
authRouter.use(requestLogger);
authRouter.use(securityHeaders);
authRouter.use(corsHandler);
authRouter.use(sanitizeInput);

/**
 * PUBLIC ROUTES - No authentication required
 * These routes are accessible to everyone and include rate limiting for security
 */

// POST /api/auth/register - User registration
authRouter.post('/register', 
  authRateLimit,                    // Strict rate limiting for registration
  authValidations.register,         // Validate registration data
  authController.register          // Registration controller
);

// POST /api/auth/login - User login
authRouter.post('/login',
  authRateLimit,                    // Strict rate limiting for login attempts
  authValidations.login,            // Validate login credentials
  authController.login             // Login controller
);

// POST /api/auth/refresh - Refresh JWT token
authRouter.post('/refresh',
  generalRateLimit,                 // Moderate rate limiting for token refresh
  authValidations.refreshToken,     // Validate refresh token format
  authController.refreshToken      // Token refresh controller
);

// POST /api/auth/request-password-reset - Request password reset
authRouter.post('/request-password-reset',
  authRateLimit,                    // Strict rate limiting to prevent abuse
  authValidations.forgotPassword,   // Validate email format
  authController.forgotPassword    // Password reset request controller
);

// POST /api/auth/reset-password - Complete password reset
authRouter.post('/reset-password',
  generalRateLimit,                 // Moderate rate limiting
  authValidations.resetPassword,    // Validate reset data
  authController.resetPassword     // Password reset completion controller
);

// GET /api/auth/verify-email - Verify email address
authRouter.get('/verify-email',
  generalRateLimit,                 // Standard rate limiting
  authController.verifyEmail       // Email verification controller
);

/**
 * PROTECTED ROUTES - Authentication required
 * These routes require a valid JWT token but don't require email verification
 */

// POST /api/auth/logout - User logout
authRouter.post('/logout',
  ...protectedRoute,               // Apply authentication middleware
  authController.logout           // Logout controller
);

// POST /api/auth/change-password - Change password for authenticated user
authRouter.post('/change-password',
  ...protectedRoute,               // Require authentication
  authValidations.changePassword,  // Validate password change data
  authController.changePassword   // Password change controller
);

// POST /api/auth/resend-verification - Resend email verification
authRouter.post('/resend-verification',
  authenticate,                    // Require authentication
  requireActiveAccount,            // Require active account
  authController.resendVerification // Resend verification controller
);

// GET /api/auth/profile - Get user profile
authRouter.get('/profile',
  ...protectedRoute,               // Require authentication
  authController.getProfile       // Get profile controller
);

/**
 * VERIFIED ROUTES - Authentication + Email verification required
 * These routes require both valid JWT token and verified email address
 */

// PUT /api/auth/profile - Update user profile
authRouter.put('/profile',
  ...verifiedRoute,                // Require authentication + verification
  userValidations.updateProfile,   // Validate profile update data
  authController.updateProfile    // Update profile controller
);

// GET /api/auth/activity - Get user activity/audit logs
authRouter.get('/activity',
  ...verifiedRoute,                // Require authentication + verification
  authController.getUserActivity  // Get user activity controller
);

/**
 * DEVELOPMENT/DEBUG ROUTES
 * These routes should only be available in development mode
 */
if (process.env.NODE_ENV === 'development') {
  // GET /api/auth/debug/token - Debug token information
  authRouter.get('/debug/token',
    authenticate,
    (req: any, res) => {
      res.json({
        success: true,
        data: {
          userId: req.user?.id,
          email: req.user?.email,
          roles: req.user?.roles,
          permissions: req.user?.permissions,
          tokenType: 'access',
          issuedAt: new Date(req.user?.iat! * 1000),
          expiresAt: new Date(req.user?.exp! * 1000)
        }
      });
    }
  );
}

export default authRouter;
