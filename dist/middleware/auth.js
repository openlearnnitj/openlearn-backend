"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActiveAccount = exports.requireEmailVerification = exports.authRateLimit = exports.optionalAuthenticate = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const common_1 = require("../utils/common");
const database_1 = require("../config/database");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
/**
 * Rate limiter for authentication endpoints to prevent brute force attacks
 */
const authLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 5, // Number of attempts
    duration: 15 * 60, // Per 15 minutes
    blockDuration: 15 * 60, // Block for 15 minutes
});
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
const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header (Bearer <token>)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next((0, common_1.createApiError)('Access token is required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify JWT token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
        }
        catch (jwtError) {
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return next((0, common_1.createApiError)('Access token has expired', 401, common_1.ErrorCodes.TOKEN_EXPIRED));
            }
            else if (jwtError instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return next((0, common_1.createApiError)('Invalid access token', 401, common_1.ErrorCodes.INVALID_TOKEN));
            }
            throw jwtError;
        }
        // Fetch user from database with roles and permissions
        const user = await database_1.prisma.user.findUnique({
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
            return next((0, common_1.createApiError)('User not found or inactive', 401, common_1.ErrorCodes.USER_NOT_FOUND));
        }
        // Check if user's email verification status (if required)
        if (!user.emailVerified && config_1.config.auth.requireEmailVerification) {
            return next((0, common_1.createApiError)('Email verification required', 403, common_1.ErrorCodes.EMAIL_NOT_VERIFIED));
        }
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
        const allPermissions = user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => ({
            name: rp.permission.name,
            resource: rp.permission.resource,
            action: rp.permission.action
        })));
        // Remove duplicate permissions by name
        const uniquePermissions = allPermissions.filter((permission, index, self) => index === self.findIndex(p => p.name === permission.name));
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
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        next((0, common_1.createApiError)('Authentication failed', 500, common_1.ErrorCodes.INTERNAL_SERVER_ERROR));
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
const optionalAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    // If no token provided, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    // If token is provided, authenticate it
    return (0, exports.authenticate)(req, res, next);
};
exports.optionalAuthenticate = optionalAuthenticate;
/**
 * Rate limiting middleware for authentication endpoints
 * Prevents brute force attacks on login, register, etc.
 */
const authRateLimit = async (req, res, next) => {
    try {
        const key = req.ip || 'unknown';
        await authLimiter.consume(key);
        next();
    }
    catch (rateLimiterRes) {
        const msBeforeNext = Math.round(rateLimiterRes.msBeforeNext) || 1;
        res.set('Retry-After', String(Math.round(msBeforeNext / 1000)));
        return next((0, common_1.createApiError)('Too many authentication attempts. Please try again later.', 429, common_1.ErrorCodes.RATE_LIMIT_EXCEEDED));
    }
};
exports.authRateLimit = authRateLimit;
/**
 * Middleware to check if user has verified their email
 * Should be used after authenticate middleware
 */
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
    }
    if (!req.user.emailVerified) {
        return next((0, common_1.createApiError)('Email verification required', 403, common_1.ErrorCodes.EMAIL_NOT_VERIFIED));
    }
    next();
};
exports.requireEmailVerification = requireEmailVerification;
/**
 * Middleware to ensure user account is active
 * Should be used after authenticate middleware
 */
const requireActiveAccount = (req, res, next) => {
    if (!req.user) {
        return next((0, common_1.createApiError)('Authentication required', 401, common_1.ErrorCodes.AUTHENTICATION_REQUIRED));
    }
    if (!req.user.isActive) {
        return next((0, common_1.createApiError)('Account is inactive', 403, common_1.ErrorCodes.ACCOUNT_INACTIVE));
    }
    next();
};
exports.requireActiveAccount = requireActiveAccount;
