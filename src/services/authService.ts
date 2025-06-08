import { prisma } from '../config/database';
import { RegisterDTO, LoginDTO, AuthResponse, AppError, AuditLogData } from '../types';
import { PasswordUtils, TokenUtils, CryptoUtils, DateUtils } from '../utils/auth';
import { Logger, createApiError, ErrorCodes } from '../utils/common';

/**
 * Authentication Service
 * Handles user registration, login, token management, and security operations
 */
export class AuthService {
  /**
   * Register a new user with role assignment
   */
  static async register(userData: RegisterDTO, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = PasswordUtils.validate(userData.password);
      if (!passwordValidation.isValid) {
        throw new AppError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400,
          'WEAK_PASSWORD'
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            ...(userData.username ? [{ username: userData.username }] : [])
          ]
        }
      });

      if (existingUser) {
        throw new AppError(
          'User with this email or username already exists',
          409,
          'USER_EXISTS'
        );
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hash(userData.password);

      // Start transaction for user creation and role assignment
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            isActive: true,
            profile: {
              create: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                studentId: userData.studentId,
                isAlumni: userData.isAlumni || false,
                country: 'India'
              }
            }
          },
          include: {
            profile: true
          }
        });

        // Assign default role (Pioneer for students, could be different for alumni)
        const defaultRoleName = userData.isAlumni ? 'ALUMNI_PIONEER' : 'PIONEER';
        
        let defaultRole = await tx.role.findUnique({
          where: { name: defaultRoleName }
        });

        // Create default role if it doesn't exist
        if (!defaultRole) {
          defaultRole = await tx.role.create({
            data: {
              name: defaultRoleName,
              displayName: userData.isAlumni ? 'Alumni Pioneer' : 'Pioneer',
              description: userData.isAlumni 
                ? 'Alumni member with basic access'
                : 'Student member with basic access',
              level: 1,
              isActive: true
            }
          });
        }

        // Assign role to user
        await tx.userRole.create({
          data: {
            userId: newUser.id,
            roleId: defaultRole.id,
            isActive: true
          }
        });

        return newUser;
      });

      // Log audit event
      await this.logAuditEvent({
        userId: result.id,
        action: 'USER_REGISTERED',
        resource: 'user',
        resourceId: result.id,
        details: {
          email: userData.email,
          username: userData.username,
          isAlumni: userData.isAlumni
        },
        ipAddress,
        userAgent
      });

      // Generate tokens
      const userWithRoles = await this.getUserWithRoles(result.id);
      if (!userWithRoles) {
        throw createApiError('User not found after registration', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
      }
      
      const tokens = TokenUtils.generateTokenPair({
        userId: result.id,
        email: result.email,
        username: result.username || undefined,
        roles: userWithRoles.userRoles.map(ur => ur.role.name)
      });

      // Store refresh token
      await this.storeRefreshToken(result.id, tokens.refreshToken);

      Logger.info(`User registered successfully: ${result.email}`);

      return {
        user: {
          id: result.id,
          email: result.email,
          username: result.username || undefined,
          firstName: result.profile?.firstName || undefined,
          lastName: result.profile?.lastName || undefined,
          avatar: result.profile?.avatar || undefined,
          roles: userWithRoles.userRoles.map(ur => ur.role.name)
        },
        tokens
      };

    } catch (error) {
      Logger.error('Registration failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Authenticate user login
   */
  static async login(loginData: LoginDTO, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      // Find user with roles
      const user = await this.getUserWithRoles(null, loginData.email);
      
      if (!user) {
        // Log failed login attempt
        await this.logLoginAttempt(loginData.email, false, ipAddress, userAgent);
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(loginData.password, user.password);
      
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.logLoginAttempt(loginData.email, false, ipAddress, userAgent, user.id);
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Log successful login attempt
      await this.logLoginAttempt(loginData.email, true, ipAddress, userAgent, user.id);

      // Generate tokens
      const tokens = TokenUtils.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
        roles: user.userRoles.map(ur => ur.role.name)
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Log audit event
      await this.logAuditEvent({
        userId: user.id,
        action: 'USER_LOGIN',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent
      });

      Logger.info(`User logged in successfully: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          firstName: user.profile?.firstName || undefined,
          lastName: user.profile?.lastName || undefined,
          avatar: user.profile?.avatar || undefined,
          roles: user.userRoles.map(ur => ur.role.name)
        },
        tokens
      };

    } catch (error) {
      Logger.error('Login failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Login failed', 500, 'LOGIN_ERROR');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const payload = TokenUtils.verifyRefreshToken(refreshToken);
      
      // Check if refresh token exists and is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              userRoles: {
                where: { isActive: true },
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
          }
        }
      });

      if (!storedToken || storedToken.isRevoked || DateUtils.isExpired(storedToken.expiresAt)) {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      if (!storedToken.user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
      }

      // Generate new access token
      const accessToken = TokenUtils.generateAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        username: storedToken.user.username,
        roles: storedToken.user.userRoles.map(ur => ur.role.name)
      });

      Logger.info(`Token refreshed for user: ${storedToken.user.email}`);

      return {
        accessToken,
        expiresIn: TokenUtils['getExpirationTime'](process.env.JWT_EXPIRES_IN || '15m')
      };

    } catch (error) {
      Logger.error('Token refresh failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Token refresh failed', 500, 'TOKEN_REFRESH_ERROR');
    }
  }

  /**
   * Logout user by revoking refresh token
   */
  static async logout(refreshToken: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true }
      });

      Logger.info('User logged out successfully');
    } catch (error) {
      Logger.error('Logout failed:', error);
      throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
    }
  }

  /**
   * Get user with roles and permissions
   */
  private static async getUserWithRoles(userId?: string | null, email?: string) {
    const where = userId ? { id: userId } : { email };
    
    return prisma.user.findUnique({
      where,
      include: {
        profile: true,
        userRoles: {
          where: { isActive: true },
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
  }

  /**
   * Store refresh token in database
   */
  private static async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = DateUtils.addTime(new Date(), 7, 'days'); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        isRevoked: false
      }
    });
  }

  /**
   * Log login attempts for security monitoring
   */
  private static async logLoginAttempt(
    email: string,
    successful: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          email,
          successful,
          ipAddress: ipAddress || 'unknown',
          userAgent,
          userId
        }
      });
    } catch (error) {
      Logger.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Log audit events
   */
  private static async logAuditEvent(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent
        }
      });
    } catch (error) {
      Logger.error('Failed to log audit event:', error);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal that user doesn't exist
        Logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate secure token
      const token = CryptoUtils.generateSecureToken();
      const expiresAt = DateUtils.addTime(new Date(), 1, 'hours'); // 1 hour expiry

      // Store password reset token
      await prisma.passwordReset.create({
        data: {
          email,
          token,
          expiresAt,
          used: false
        }
      });

      // TODO: Send password reset email
      Logger.info(`Password reset token generated for: ${email}`);

    } catch (error) {
      Logger.error('Password reset request failed:', error);
      throw new AppError('Password reset request failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400,
          'WEAK_PASSWORD'
        );
      }

      // Find valid reset token
      const resetToken = await prisma.passwordReset.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken || resetToken.used || DateUtils.isExpired(resetToken.expiresAt)) {
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hash(newPassword);

      // Update user password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { email: resetToken.email },
          data: { password: hashedPassword }
        }),
        prisma.passwordReset.update({
          where: { token },
          data: { used: true }
        }),
        // Revoke all existing refresh tokens for security
        prisma.refreshToken.updateMany({
          where: { userId: resetToken.user.id },
          data: { isRevoked: true }
        })
      ]);

      Logger.info(`Password reset successful for: ${resetToken.email}`);

    } catch (error) {
      Logger.error('Password reset failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get user with current password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      // Validate new password
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400,
          'WEAK_PASSWORD'
        );
      }

      // Hash new password
      const hashedNewPassword = await PasswordUtils.hash(newPassword);

      // Update password and revoke all refresh tokens for security
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword }
        }),
        prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true }
        })
      ]);

      // Log audit event
      await this.logAuditEvent({
        userId,
        action: 'PASSWORD_CHANGED',
        resource: 'user',
        resourceId: userId
      });

      Logger.info(`Password changed successfully for user: ${userId}`);

    } catch (error) {
      Logger.error('Password change failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Password change failed', 500, 'PASSWORD_CHANGE_ERROR');
    }
  }

  /**
   * Verify email address using token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      // For now, we'll use a simple approach where we find the token in a separate verification system
      // This is a placeholder implementation - in production, you'd want a proper EmailVerification model
      
      // Verify the token format and extract email (this is a simplified approach)
      const decoded = TokenUtils.verifyAccessToken(token);
      const email = decoded.email;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new AppError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      }

      if (user.emailVerified) {
        throw new AppError('Email already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Update user to mark email as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true
        }
      });

      // Log audit event
      await this.logAuditEvent({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        resource: 'user',
        resourceId: user.id
      });

      Logger.info(`Email verified successfully for user: ${user.email}`);

    } catch (error) {
      Logger.error('Email verification failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Email verification failed', 500, 'EMAIL_VERIFICATION_ERROR');
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(email: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal that user doesn't exist
        Logger.info(`Email verification resend requested for non-existent email: ${email}`);
        return;
      }

      if (user.emailVerified) {
        throw new AppError('Email already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Generate verification token (simplified approach using JWT)
      const verificationToken = TokenUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username || undefined,
        roles: [],
        type: 'verification' as any
      });

      // TODO: Send verification email with the token
      Logger.info(`Email verification token generated for: ${email}`);

    } catch (error) {
      Logger.error('Email verification resend failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Email verification resend failed', 500, 'EMAIL_VERIFICATION_RESEND_ERROR');
    }
  }

  /**
   * Get user profile with detailed information
   */
  static async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          userRoles: {
            where: { isActive: true },
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
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Format user data
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profile: user.profile ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          dateOfBirth: user.profile.dateOfBirth,
          bio: user.profile.bio,
          avatar: user.profile.avatar,
          studentId: user.profile.studentId,
          isAlumni: user.profile.isAlumni,
          country: user.profile.country,
          linkedinProfile: user.profile.linkedinProfile,
          githubProfile: user.profile.githubProfile
        } : null,
        roles: user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          displayName: ur.role.displayName,
          level: ur.role.level,
          permissions: ur.role.rolePermissions.map(rp => ({
            name: rp.permission.name,
            resource: rp.permission.resource,
            action: rp.permission.action
          }))
        }))
      };

    } catch (error) {
      Logger.error('Get user profile failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to get user profile', 500, 'GET_PROFILE_ERROR');
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updateData: any): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prepare user update data
      const userUpdateData: any = {};
      if (updateData.username !== undefined) {
        // Check if username is already taken
        if (updateData.username) {
          const existingUser = await prisma.user.findFirst({
            where: {
              username: updateData.username,
              id: { not: userId }
            }
          });

          if (existingUser) {
            throw new AppError('Username already taken', 400, 'USERNAME_TAKEN');
          }
        }
        userUpdateData.username = updateData.username;
      }

      // Prepare profile update data
      const profileUpdateData: any = {};
      const profileFields = ['firstName', 'lastName', 'bio', 'avatar', 'linkedinProfile', 'githubProfile'];
      
      profileFields.forEach(field => {
        if (updateData[field] !== undefined) {
          profileUpdateData[field] = updateData[field];
        }
      });

      // Perform updates in transaction
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Update user if there's user data to update
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdateData
          });
        }

        // Update profile if there's profile data to update
        if (Object.keys(profileUpdateData).length > 0) {
          if (user.profile) {
            await tx.userProfile.update({
              where: { userId },
              data: profileUpdateData
            });
          } else {
            await tx.userProfile.create({
              data: {
                userId,
                ...profileUpdateData
              }
            });
          }
        }

        // Return updated user
        return tx.user.findUnique({
          where: { id: userId },
          include: { profile: true }
        });
      });

      // Log audit event
      await this.logAuditEvent({
        userId,
        action: 'PROFILE_UPDATED',
        resource: 'user',
        resourceId: userId,
        details: updateData
      });

      Logger.info(`Profile updated for user: ${userId}`);

      return this.getUserProfile(userId);

    } catch (error) {
      Logger.error('Profile update failed:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Profile update failed', 500, 'PROFILE_UPDATE_ERROR');
    }
  }

  /**
   * Get user activity/audit logs
   */
  static async getUserActivity(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.auditLog.count({
          where: { userId }
        })
      ]);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      Logger.error('Get user activity failed:', error);
      throw new AppError('Failed to get user activity', 500, 'GET_ACTIVITY_ERROR');
    }
  }
}
