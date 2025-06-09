import { User, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthUser, TokenPayload, SignupRequest, LoginRequest, AuthResponse } from '../types';
import { PasswordUtils } from '../utils/password';
import { JWTUtils } from '../utils/jwt';
import { ValidationUtils } from '../utils/validation';

export class AuthService {
  /**
   * Register a new user
   */
  static async signup(signupData: SignupRequest): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateSignupData(signupData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePassword(signupData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: signupData.email.toLowerCase() },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hashPassword(signupData.password);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: signupData.email.toLowerCase(),
          password: hashedPassword,
          name: ValidationUtils.sanitizeString(signupData.name),
          role: UserRole.PIONEER, // Default role
          status: UserStatus.PENDING, // Requires approval
        },
      });

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };

      const accessToken = JWTUtils.generateAccessToken(tokenPayload);
      const refreshToken = JWTUtils.generateRefreshToken(tokenPayload);

      // Convert to AuthUser
      const authUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
      };

      return {
        success: true,
        data: {
          user: authUser,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'Internal server error during signup',
      };
    }
  }

  /**
   * Login user
   */
  static async login(loginData: LoginRequest): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
    try {
      // Validate input data
      const validation = ValidationUtils.validateLoginData(loginData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: loginData.email.toLowerCase() },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Check if user is suspended
      if (user.status === UserStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Account is suspended. Please contact support.',
        };
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.verifyPassword(loginData.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = JWTUtils.generateAccessToken(tokenPayload);
      const refreshToken = JWTUtils.generateRefreshToken(tokenPayload);

      // Convert to AuthUser
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      };

      return {
        success: true,
        data: {
          user: authUser,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error during login',
      };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ success: boolean; data?: { accessToken: string }; error?: string }> {
    try {
      // Verify refresh token
      const tokenPayload = JWTUtils.verifyRefreshToken(refreshToken);
      if (!tokenPayload) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Check if user still exists and is active
      const user = await this.getUserById(tokenPayload.userId);
      if (!user || user.status === UserStatus.SUSPENDED) {
        return {
          success: false,
          error: 'User not found or suspended',
        };
      }

      // Generate new access token
      const newTokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = JWTUtils.generateAccessToken(newTokenPayload);

      return {
        success: true,
        data: { accessToken },
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        error: 'Internal server error during token refresh',
      };
    }
  }
}
