import jwt from 'jsonwebtoken';
import config from '../config/environment';
import { TokenPayload } from '../types';

export class JWTUtils {
  /**
   * Generate an access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.refreshTokenSecret, {
      expiresIn: config.refreshTokenExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
