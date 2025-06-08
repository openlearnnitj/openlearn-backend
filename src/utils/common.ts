import { ApiResponse } from '@/types';

/**
 * Standardized error codes for the application
 */
export enum ErrorCodes {
  // General errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  
  // Authentication errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // User/Resource errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_SCHEMA_ERROR = 'DATABASE_SCHEMA_ERROR',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  REQUIRED_RELATION_MISSING = 'REQUIRED_RELATION_MISSING',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // File upload errors
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  TOO_MANY_FILES = 'TOO_MANY_FILES',
  UNEXPECTED_FILE_FIELD = 'UNEXPECTED_FILE_FIELD',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // API errors
  INVALID_JSON = 'INVALID_JSON',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  
  // Security errors
  IP_NOT_ALLOWED = 'IP_NOT_ALLOWED',
  API_KEY_REQUIRED = 'API_KEY_REQUIRED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Helper function to create API errors
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
  details?: any
): ApiError {
  return new ApiError(message, statusCode, code, details);
}

/**
 * Standardized API response utilities
 */
export class ResponseUtils {
  /**
   * Create a success response
   */
  static success<T>(
    message: string,
    data?: T,
    meta?: ApiResponse<T>['meta']
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    meta?: ApiResponse['meta']
  ): ApiResponse {
    return {
      success: false,
      message,
      error: {
        code,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    message: string,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          ...pagination,
          totalPages
        }
      }
    };
  }

  /**
   * Create a response for created resources
   */
  static created<T>(message: string, data: T): ApiResponse<T> {
    return this.success(message, data);
  }

  /**
   * Create a response for updated resources
   */
  static updated<T>(message: string, data: T): ApiResponse<T> {
    return this.success(message, data);
  }

  /**
   * Create a response for deleted resources
   */
  static deleted(message: string = 'Resource deleted successfully'): ApiResponse {
    return this.success(message);
  }

  /**
   * Create a not found response
   */
  static notFound(message: string = 'Resource not found'): ApiResponse {
    return this.error(message, 'NOT_FOUND');
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(message: string = 'Unauthorized access'): ApiResponse {
    return this.error(message, 'UNAUTHORIZED');
  }

  /**
   * Create a forbidden response
   */
  static forbidden(message: string = 'Forbidden access'): ApiResponse {
    return this.error(message, 'FORBIDDEN');
  }

  /**
   * Create a validation error response
   */
  static validationError(message: string, details?: any): ApiResponse {
    return this.error(message, 'VALIDATION_ERROR', details);
  }

  /**
   * Create a server error response
   */
  static serverError(message: string = 'Internal server error', details?: any): ApiResponse {
    return this.error(message, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Pagination utilities
 */
export class PaginationUtils {
  /**
   * Calculate pagination parameters
   */
  static calculatePagination(page: number = 1, limit: number = 10) {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const skip = (normalizedPage - 1) * normalizedLimit;

    return {
      skip,
      take: normalizedLimit,
      page: normalizedPage,
      limit: normalizedLimit
    };
  }

  /**
   * Create pagination metadata
   */
  static createMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  }
}

/**
 * Logging utilities
 */
export class Logger {
  private static log(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
  }

  static info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  static warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  static error(message: string, error?: any, ...args: any[]) {
    this.log('error', message, error, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, ...args);
    }
  }
}

/**
 * File utilities
 */
export class FileUtils {
  /**
   * Get file extension from filename
   */
  static getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is allowed
   */
  static isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = this.getExtension(filename);
    return allowedTypes.includes(extension);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const extension = this.getExtension(originalName);
    const nameWithoutExt = originalName.replace(`.${extension}`, '');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
