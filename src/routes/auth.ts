import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { PasswordResetOTPController } from '../controllers/PasswordResetOTPController';
import { AuthMiddleware } from '../middleware/auth';

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

/**
 * Password Reset Routes (OTP-based)
 */

/**
 * @route POST /auth/forgot-password
 * @desc Request password reset (send OTP email)
 * @access Public
 */
router.post('/forgot-password', PasswordResetOTPController.requestPasswordResetOTP);

/**
 * @route POST /auth/validate-reset-otp
 * @desc Validate password reset OTP
 * @access Public
 */
router.post('/validate-reset-otp', PasswordResetOTPController.validateResetOTP);

/**
 * @route POST /auth/reset-password-with-otp
 * @desc Reset password using valid OTP
 * @access Public
 */
router.post('/reset-password-with-otp', PasswordResetOTPController.resetPasswordWithOTP);

/**
 * @route GET /auth/password-reset/rate-limit/:email
 * @desc Check rate limiting for password reset requests
 * @access Public
 */
router.get('/password-reset/rate-limit/:email', PasswordResetOTPController.checkRateLimit);

/**
 * @route GET /auth/password-reset/stats
 * @desc Get password reset statistics (admin only)
 * @access Private (Admin)
 */
router.get('/password-reset/stats', AuthMiddleware.authenticate, PasswordResetOTPController.getResetStatistics);

/**
 * @route POST /auth/password-reset/test-otp-email
 * @desc Test password reset OTP email templates
 * @access Private (Admin)
 */
router.post('/password-reset/test-otp-email', AuthMiddleware.authenticate, PasswordResetOTPController.testResetOTPEmail);

export default router;
