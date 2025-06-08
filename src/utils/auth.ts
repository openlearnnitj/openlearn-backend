import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { config } from '../config';
import { TokenPayload } from '../types';

/**
 * Password hashing utilities using bcrypt
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password using bcrypt
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * Requirements: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
   */
  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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

/**
 * JWT token utilities
 */
export class TokenUtils {
  /**
   * Generate an access token
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): string {
    const secret = config.jwt.accessSecret as string;
    const expiresIn = config.jwt.accessExpiresIn as string;
    
    if (!secret) {
      throw new Error('JWT access secret is not configured');
    }
    
    const tokenPayload = { ...payload, type: 'access' as const };
    
    try {
      return (jwt.sign as any)(tokenPayload, secret, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error}`);
    }
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): string {
    const secret = config.jwt.refreshSecret as string;
    const expiresIn = config.jwt.refreshExpiresIn as string;
    
    if (!secret) {
      throw new Error('JWT refresh secret is not configured');
    }
    
    const tokenPayload = { ...payload, type: 'refresh' as const };
    
    try {
      return (jwt.sign as any)(tokenPayload, secret, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error}`);
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: this.getExpirationTime(config.jwt.accessExpiresIn as string)
    };
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret as string) as TokenPayload;
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.refreshSecret as string) as TokenPayload;
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decode(token: string): TokenPayload | null {
    return jwt.decode(token) as TokenPayload | null;
  }

  /**
   * Get expiration time in seconds from duration string
   */
  private static getExpirationTime(duration: string): number {
    const match = duration.match(/(\d+)([smhd])/);
    if (!match) return 900; // Default 15 minutes

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

/**
 * Random string and token generation utilities
 */
export class CryptoUtils {
  /**
   * Generate a secure random string
   */
  static generateRandomString(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random token for password resets, etc.
   */
  static generateSecureToken(): string {
    return this.generateRandomString(64);
  }

  /**
   * Create a hash of a string (for unique constraints, etc.)
   */
  static createHash(input: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(input).digest('hex');
  }

  /**
   * Generate a URL-safe slug from a string
   */
  static generateSlug(text: string): string {
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
  static generateUniqueSlug(text: string): string {
    const baseSlug = this.generateSlug(text);
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }
}

/**
 * Date and time utilities
 */
export class DateUtils {
  /**
   * Add time to a date
   */
  static addTime(date: Date, amount: number, unit: 'minutes' | 'hours' | 'days'): Date {
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
  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  /**
   * Format date for API responses
   */
  static formatForAPI(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse duration string to milliseconds
   */
  static parseDuration(duration: string): number {
    const match = duration.match(/(\d+)([smhd])/);
    if (!match) return 0;

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

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Indian phone number
   */
  static isValidIndianPhone(phone: string): boolean {
    const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Validate student ID format
   */
  static isValidStudentId(studentId: string): boolean {
    // Adjust this regex based on your college's student ID format
    const studentIdRegex = /^[A-Z0-9]{6,12}$/;
    return studentIdRegex.test(studentId);
  }

  /**
   * Sanitize input string
   */
  static sanitize(input: string): string {
    return input.trim().replace(/[<>\"']/g, '');
  }

  /**
   * Check if string contains only alphanumeric characters and common symbols
   */
  static isAlphanumeric(str: string, allowSpaces: boolean = false): boolean {
    const regex = allowSpaces ? /^[a-zA-Z0-9\s]+$/ : /^[a-zA-Z0-9]+$/;
    return regex.test(str);
  }
}

/**
 * Security utilities for authentication and authorization
 */
export class SecurityUtils {
  /**
   * Extract bearer token from authorization header
   */
  static extractBearerToken(authorization?: string): string | null {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }
    return authorization.slice(7);
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    return CryptoUtils.generateRandomString(32);
  }

  /**
   * Check if IP address is in whitelist
   */
  static isIpWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.includes(ip) || whitelist.includes('*');
  }

  /**
   * Rate limit key generator
   */
  static generateRateLimitKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
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
  static isSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true;
    
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
  static generateCsrfToken(): string {
    return CryptoUtils.generateRandomString(32);
  }
}

/**
 * Combined auth utilities for easy import
 */
export const authUtils = {
  password: PasswordUtils,
  token: TokenUtils,
  security: SecurityUtils,
  validation: ValidationUtils
};
