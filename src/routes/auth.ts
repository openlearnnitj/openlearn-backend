import { Router } from 'express';
import { AuthController } from '../controllers/authController';
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

export default router;
