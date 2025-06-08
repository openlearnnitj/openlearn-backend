"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUtils = exports.SecurityUtils = exports.ValidationUtils = exports.DateUtils = exports.CryptoUtils = exports.TokenUtils = exports.PasswordUtils = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const config_1 = require("../config");
/**
 * Password hashing utilities using bcrypt
 */
class PasswordUtils {
    /**
     * Hash a password using bcrypt
     */
    static async hash(password) {
        return bcrypt_1.default.hash(password, this.SALT_ROUNDS);
    }
    /**
     * Compare a password with its hash
     */
    static async compare(password, hash) {
        return bcrypt_1.default.compare(password, hash);
    }
    /**
     * Validate password strength
     * Requirements: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
     */
    static validate(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.PasswordUtils = PasswordUtils;
PasswordUtils.SALT_ROUNDS = 12;
/**
 * JWT token utilities
 */
class TokenUtils {
    /**
     * Generate an access token
     */
    static generateAccessToken(payload) {
        const secret = config_1.config.jwt.accessSecret;
        const expiresIn = config_1.config.jwt.accessExpiresIn;
        if (!secret) {
            throw new Error('JWT access secret is not configured');
        }
        const tokenPayload = { ...payload, type: 'access' };
        try {
            return jwt.sign(tokenPayload, secret, { expiresIn });
        }
        catch (error) {
            throw new Error(`Failed to generate access token: ${error}`);
        }
    }
    /**
     * Generate a refresh token
     */
    static generateRefreshToken(payload) {
        const secret = config_1.config.jwt.refreshSecret;
        const expiresIn = config_1.config.jwt.refreshExpiresIn;
        if (!secret) {
            throw new Error('JWT refresh secret is not configured');
        }
        const tokenPayload = { ...payload, type: 'refresh' };
        try {
            return jwt.sign(tokenPayload, secret, { expiresIn });
        }
        catch (error) {
            throw new Error(`Failed to generate refresh token: ${error}`);
        }
    }
    /**
     * Generate both access and refresh tokens
     */
    static generateTokenPair(payload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
            expiresIn: this.getExpirationTime(config_1.config.jwt.accessExpiresIn)
        };
    }
    /**
     * Verify an access token
     */
    static verifyAccessToken(token) {
        return jwt.verify(token, config_1.config.jwt.accessSecret);
    }
    /**
     * Verify a refresh token
     */
    static verifyRefreshToken(token) {
        return jwt.verify(token, config_1.config.jwt.refreshSecret);
    }
    /**
     * Decode token without verification (for debugging)
     */
    static decode(token) {
        return jwt.decode(token);
    }
    /**
     * Get expiration time in seconds from duration string
     */
    static getExpirationTime(duration) {
        const match = duration.match(/(\d+)([smhd])/);
        if (!match)
            return 900; // Default 15 minutes
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 60 * 60 * 24;
            default: return 900;
        }
    }
}
exports.TokenUtils = TokenUtils;
/**
 * Random string and token generation utilities
 */
class CryptoUtils {
    /**
     * Generate a secure random string
     */
    static generateRandomString(length = 32) {
        return (0, crypto_1.randomBytes)(length).toString('hex');
    }
    /**
     * Generate a secure random token for password resets, etc.
     */
    static generateSecureToken() {
        return this.generateRandomString(64);
    }
    /**
     * Create a hash of a string (for unique constraints, etc.)
     */
    static createHash(input, algorithm = 'sha256') {
        return (0, crypto_1.createHash)(algorithm).update(input).digest('hex');
    }
    /**
     * Generate a URL-safe slug from a string
     */
    static generateSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    /**
     * Generate a unique slug with timestamp suffix
     */
    static generateUniqueSlug(text) {
        const baseSlug = this.generateSlug(text);
        const timestamp = Date.now().toString(36);
        return `${baseSlug}-${timestamp}`;
    }
}
exports.CryptoUtils = CryptoUtils;
/**
 * Date and time utilities
 */
class DateUtils {
    /**
     * Add time to a date
     */
    static addTime(date, amount, unit) {
        const result = new Date(date);
        switch (unit) {
            case 'minutes':
                result.setMinutes(result.getMinutes() + amount);
                break;
            case 'hours':
                result.setHours(result.getHours() + amount);
                break;
            case 'days':
                result.setDate(result.getDate() + amount);
                break;
        }
        return result;
    }
    /**
     * Check if a date is expired
     */
    static isExpired(date) {
        return new Date() > date;
    }
    /**
     * Format date for API responses
     */
    static formatForAPI(date) {
        return date.toISOString();
    }
    /**
     * Parse duration string to milliseconds
     */
    static parseDuration(duration) {
        const match = duration.match(/(\d+)([smhd])/);
        if (!match)
            return 0;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 0;
        }
    }
}
exports.DateUtils = DateUtils;
/**
 * Validation utilities
 */
class ValidationUtils {
    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validate Indian phone number
     */
    static isValidIndianPhone(phone) {
        const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\s+/g, ''));
    }
    /**
     * Validate student ID format
     */
    static isValidStudentId(studentId) {
        // Adjust this regex based on your college's student ID format
        const studentIdRegex = /^[A-Z0-9]{6,12}$/;
        return studentIdRegex.test(studentId);
    }
    /**
     * Sanitize input string
     */
    static sanitize(input) {
        return input.trim().replace(/[<>\"']/g, '');
    }
    /**
     * Check if string contains only alphanumeric characters and common symbols
     */
    static isAlphanumeric(str, allowSpaces = false) {
        const regex = allowSpaces ? /^[a-zA-Z0-9\s]+$/ : /^[a-zA-Z0-9]+$/;
        return regex.test(str);
    }
}
exports.ValidationUtils = ValidationUtils;
/**
 * Security utilities for authentication and authorization
 */
class SecurityUtils {
    /**
     * Extract bearer token from authorization header
     */
    static extractBearerToken(authorization) {
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return null;
        }
        return authorization.slice(7);
    }
    /**
     * Generate a secure API key
     */
    static generateApiKey() {
        return CryptoUtils.generateRandomString(32);
    }
    /**
     * Check if IP address is in whitelist
     */
    static isIpWhitelisted(ip, whitelist) {
        return whitelist.includes(ip) || whitelist.includes('*');
    }
    /**
     * Rate limit key generator
     */
    static generateRateLimitKey(prefix, identifier) {
        return `${prefix}:${identifier}`;
    }
    /**
     * Sanitize user input to prevent XSS
     */
    static sanitizeInput(input) {
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    /**
     * Check if user agent is suspicious
     */
    static isSuspiciousUserAgent(userAgent) {
        if (!userAgent)
            return true;
        const suspiciousPatterns = [
            /bot/i,
            /crawl/i,
            /spider/i,
            /scan/i,
            /hack/i,
            /^$/
        ];
        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }
    /**
     * Generate CSRF token
     */
    static generateCsrfToken() {
        return CryptoUtils.generateRandomString(32);
    }
}
exports.SecurityUtils = SecurityUtils;
/**
 * Combined auth utilities for easy import
 */
exports.authUtils = {
    password: PasswordUtils,
    token: TokenUtils,
    security: SecurityUtils,
    validation: ValidationUtils
};
