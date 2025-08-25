import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthMiddleware } from '../middleware/auth';
import { PasswordResetController } from '../controllers/PasswordResetController';

const router = Router();

/**
 * @route POST /auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', AuthController.signup);

/**
 * @route POST /auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route GET /auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', AuthMiddleware.authenticate, AuthController.getProfile);

/**
 * @route PUT /auth/profile
 * @desc Update current user profile
 * @access Private
 */
router.put('/profile', AuthMiddleware.authenticate, AuthController.updateProfile);

/**
 * @route PUT /auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', AuthMiddleware.authenticate, AuthController.changePassword);

/**
 * @route POST /auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', AuthMiddleware.authenticate, AuthController.logout);

// Password Reset Routes
/**
 * @route POST /auth/password-reset/send-otp
 * @desc Send password reset OTP to user's email
 * @access Public
 */
router.post('/password-reset/send-otp', PasswordResetController.sendPasswordResetOTP);

/**
 * @route POST /auth/password-reset/verify-otp
 * @desc Verify password reset OTP
 * @access Public
 */
router.post('/password-reset/verify-otp', PasswordResetController.verifyPasswordResetOTP);

/**
 * @route POST /auth/password-reset/reset-password
 * @desc Reset password using verified OTP
 * @access Public
 */
router.post('/password-reset/reset-password', PasswordResetController.resetPassword);

/**
 * @route GET /auth/password-reset/status
 * @desc Check if user has pending OTP
 * @access Public
 */
router.get('/password-reset/status', PasswordResetController.getPasswordResetStatus);

export default router;
