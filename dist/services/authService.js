"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_1 = require("@/config/database");
const types_1 = require("@/types");
const auth_1 = require("@/utils/auth");
const common_1 = require("@/utils/common");
/**
 * Authentication Service
 * Handles user registration, login, token management, and security operations
 */
class AuthService {
    /**
     * Register a new user with role assignment
     */
    static async register(userData, ipAddress, userAgent) {
        try {
            // Validate password strength
            const passwordValidation = auth_1.PasswordUtils.validate(userData.password);
            if (!passwordValidation.isValid) {
                throw new types_1.AppError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400, 'WEAK_PASSWORD');
            }
            // Check if user already exists
            const existingUser = await database_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: userData.email },
                        ...(userData.username ? [{ username: userData.username }] : [])
                    ]
                }
            });
            if (existingUser) {
                throw new types_1.AppError('User with this email or username already exists', 409, 'USER_EXISTS');
            }
            // Hash password
            const hashedPassword = await auth_1.PasswordUtils.hash(userData.password);
            // Start transaction for user creation and role assignment
            const result = await database_1.prisma.$transaction(async (tx) => {
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
            const tokens = auth_1.TokenUtils.generateTokenPair({
                userId: result.id,
                email: result.email,
                username: result.username,
                roles: userWithRoles.userRoles.map(ur => ur.role.name)
            });
            // Store refresh token
            await this.storeRefreshToken(result.id, tokens.refreshToken);
            common_1.Logger.info(`User registered successfully: ${result.email}`);
            return {
                user: {
                    id: result.id,
                    email: result.email,
                    username: result.username,
                    firstName: result.profile?.firstName,
                    lastName: result.profile?.lastName,
                    avatar: result.profile?.avatar,
                    roles: userWithRoles.userRoles.map(ur => ur.role.name)
                },
                tokens
            };
        }
        catch (error) {
            common_1.Logger.error('Registration failed:', error);
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError('Registration failed', 500, 'REGISTRATION_ERROR');
        }
    }
    /**
     * Authenticate user login
     */
    static async login(loginData, ipAddress, userAgent) {
        try {
            // Find user with roles
            const user = await this.getUserWithRoles(null, loginData.email);
            if (!user) {
                // Log failed login attempt
                await this.logLoginAttempt(loginData.email, false, ipAddress, userAgent);
                throw new types_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
            }
            if (!user.isActive) {
                throw new types_1.AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
            }
            // Verify password
            const isPasswordValid = await auth_1.PasswordUtils.compare(loginData.password, user.password);
            if (!isPasswordValid) {
                // Log failed login attempt
                await this.logLoginAttempt(loginData.email, false, ipAddress, userAgent, user.id);
                throw new types_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
            }
            // Log successful login attempt
            await this.logLoginAttempt(loginData.email, true, ipAddress, userAgent, user.id);
            // Generate tokens
            const tokens = auth_1.TokenUtils.generateTokenPair({
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
            common_1.Logger.info(`User logged in successfully: ${user.email}`);
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    firstName: user.profile?.firstName,
                    lastName: user.profile?.lastName,
                    avatar: user.profile?.avatar,
                    roles: user.userRoles.map(ur => ur.role.name)
                },
                tokens
            };
        }
        catch (error) {
            common_1.Logger.error('Login failed:', error);
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError('Login failed', 500, 'LOGIN_ERROR');
        }
    }
    /**
     * Refresh access token using refresh token
     */
    static async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const payload = auth_1.TokenUtils.verifyRefreshToken(refreshToken);
            // Check if refresh token exists and is not revoked
            const storedToken = await database_1.prisma.refreshToken.findUnique({
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
            if (!storedToken || storedToken.isRevoked || auth_1.DateUtils.isExpired(storedToken.expiresAt)) {
                throw new types_1.AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
            }
            if (!storedToken.user.isActive) {
                throw new types_1.AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
            }
            // Generate new access token
            const accessToken = auth_1.TokenUtils.generateAccessToken({
                userId: storedToken.user.id,
                email: storedToken.user.email,
                username: storedToken.user.username,
                roles: storedToken.user.userRoles.map(ur => ur.role.name)
            });
            common_1.Logger.info(`Token refreshed for user: ${storedToken.user.email}`);
            return {
                accessToken,
                expiresIn: auth_1.TokenUtils['getExpirationTime'](process.env.JWT_EXPIRES_IN || '15m')
            };
        }
        catch (error) {
            common_1.Logger.error('Token refresh failed:', error);
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError('Token refresh failed', 500, 'TOKEN_REFRESH_ERROR');
        }
    }
    /**
     * Logout user by revoking refresh token
     */
    static async logout(refreshToken) {
        try {
            await database_1.prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true }
            });
            common_1.Logger.info('User logged out successfully');
        }
        catch (error) {
            common_1.Logger.error('Logout failed:', error);
            throw new types_1.AppError('Logout failed', 500, 'LOGOUT_ERROR');
        }
    }
    /**
     * Get user with roles and permissions
     */
    static async getUserWithRoles(userId, email) {
        const where = userId ? { id: userId } : { email };
        return database_1.prisma.user.findUnique({
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
    static async storeRefreshToken(userId, token) {
        const expiresAt = auth_1.DateUtils.addTime(new Date(), 7, 'days'); // 7 days from now
        await database_1.prisma.refreshToken.create({
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
    static async logLoginAttempt(email, successful, ipAddress, userAgent, userId) {
        try {
            await database_1.prisma.loginAttempt.create({
                data: {
                    email,
                    successful,
                    ipAddress: ipAddress || 'unknown',
                    userAgent,
                    userId
                }
            });
        }
        catch (error) {
            common_1.Logger.error('Failed to log login attempt:', error);
        }
    }
    /**
     * Log audit events
     */
    static async logAuditEvent(data) {
        try {
            await database_1.prisma.auditLog.create({
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
        }
        catch (error) {
            common_1.Logger.error('Failed to log audit event:', error);
        }
    }
    /**
     * Request password reset
     */
    static async requestPasswordReset(email) {
        try {
            const user = await database_1.prisma.user.findUnique({
                where: { email }
            });
            if (!user) {
                // Don't reveal that user doesn't exist
                common_1.Logger.info(`Password reset requested for non-existent email: ${email}`);
                return;
            }
            // Generate secure token
            const token = auth_1.CryptoUtils.generateSecureToken();
            const expiresAt = auth_1.DateUtils.addTime(new Date(), 1, 'hours'); // 1 hour expiry
            // Store password reset token
            await database_1.prisma.passwordReset.create({
                data: {
                    email,
                    token,
                    expiresAt,
                    used: false
                }
            });
            // TODO: Send password reset email
            common_1.Logger.info(`Password reset token generated for: ${email}`);
        }
        catch (error) {
            common_1.Logger.error('Password reset request failed:', error);
            throw new types_1.AppError('Password reset request failed', 500, 'PASSWORD_RESET_ERROR');
        }
    }
    /**
     * Reset password using token
     */
    static async resetPassword(token, newPassword) {
        try {
            // Validate new password
            const passwordValidation = auth_1.PasswordUtils.validate(newPassword);
            if (!passwordValidation.isValid) {
                throw new types_1.AppError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400, 'WEAK_PASSWORD');
            }
            // Find valid reset token
            const resetToken = await database_1.prisma.passwordReset.findUnique({
                where: { token },
                include: { user: true }
            });
            if (!resetToken || resetToken.used || auth_1.DateUtils.isExpired(resetToken.expiresAt)) {
                throw new types_1.AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
            }
            // Hash new password
            const hashedPassword = await auth_1.PasswordUtils.hash(newPassword);
            // Update user password and mark token as used
            await database_1.prisma.$transaction([
                database_1.prisma.user.update({
                    where: { email: resetToken.email },
                    data: { password: hashedPassword }
                }),
                database_1.prisma.passwordReset.update({
                    where: { token },
                    data: { used: true }
                }),
                // Revoke all existing refresh tokens for security
                database_1.prisma.refreshToken.updateMany({
                    where: { userId: resetToken.user.id },
                    data: { isRevoked: true }
                })
            ]);
            common_1.Logger.info(`Password reset successful for: ${resetToken.email}`);
        }
        catch (error) {
            common_1.Logger.error('Password reset failed:', error);
            if (error instanceof types_1.AppError) {
                throw error;
            }
            throw new types_1.AppError('Password reset failed', 500, 'PASSWORD_RESET_ERROR');
        }
    }
}
exports.AuthService = AuthService;
