import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { config } from '../config';
import { ApiError, ErrorCodes } from '../utils/common';
import { prisma } from '../config/database';

/**
 * Comprehensive error handling middleware for OpenLearn backend
 * 
 * This module handles different types of errors:
 * - Custom API errors
 * - Prisma database errors  
 * - Validation errors
 * - Multer file upload errors
 * - JWT errors
 * - Rate limiting errors
 * - Unexpected server errors
 * 
 * Features:
 * - Proper error logging
 * - Audit trail for security events
 * - Different response formats for development vs production
 * - Error categorization and standardized responses
 */

/**
 * Interface for error response structure
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Interface for error logging
 */
interface ErrorLogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: any;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  stack?: string;
}

/**
 * Main error handling middleware
 * This should be the last middleware in the Express app
 */
export const errorHandler = async (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Generate unique request ID for tracking
  const requestId = generateRequestId();
  
  // Extract user information if available
  const user = (req as any).user;
  const userId = user?.id;

  // Log the error
  await logError(error, req, requestId, userId);

  // Determine error type and create appropriate response
  const errorResponse = createErrorResponse(error, requestId);

  // Set appropriate HTTP status code
  const statusCode = getStatusCode(error);

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Create standardized error response based on error type
 */
function createErrorResponse(error: any, requestId: string): ErrorResponse {
  const baseResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  // Handle custom API errors
  if (error instanceof ApiError) {
    baseResponse.error.code = error.code;
    baseResponse.error.message = error.message;
    if (error.details && config.app.env === 'development') {
      baseResponse.error.details = error.details;
    }
    return baseResponse;
  }

  // Handle Prisma database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, baseResponse);
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    baseResponse.error.code = ErrorCodes.VALIDATION_ERROR;
    baseResponse.error.message = 'Database validation error';
    if (config.app.env === 'development') {
      baseResponse.error.details = error.message;
    }
    return baseResponse;
  }

  // Handle Multer file upload errors
  if (error instanceof MulterError) {
    return handleMulterError(error, baseResponse);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    baseResponse.error.code = ErrorCodes.AUTHENTICATION_FAILED;
    baseResponse.error.message = 'Authentication failed';
    return baseResponse;
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    baseResponse.error.code = ErrorCodes.RATE_LIMIT_EXCEEDED;
    baseResponse.error.message = 'Too many requests. Please try again later.';
    return baseResponse;
  }

  // Handle syntax errors in JSON
  if (error instanceof SyntaxError && 'body' in error) {
    baseResponse.error.code = ErrorCodes.INVALID_JSON;
    baseResponse.error.message = 'Invalid JSON in request body';
    return baseResponse;
  }

  // Handle validation errors from express-validator (shouldn't reach here if using handleValidationErrors)
  if (error.errors && Array.isArray(error.errors)) {
    baseResponse.error.code = ErrorCodes.VALIDATION_ERROR;
    baseResponse.error.message = 'Validation failed';
    baseResponse.error.details = error.errors;
    return baseResponse;
  }

  // Handle network and timeout errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    baseResponse.error.code = ErrorCodes.NETWORK_ERROR;
    baseResponse.error.message = 'Network error occurred';
    return baseResponse;
  }

  // For unknown errors, provide minimal information in production
  if (config.app.env === 'production') {
    baseResponse.error.message = 'Internal server error';
  } else {
    baseResponse.error.message = error.message || 'An unexpected error occurred';
    baseResponse.error.details = {
      name: error.name,
      stack: error.stack
    };
  }

  return baseResponse;
}

/**
 * Handle Prisma database errors with specific error codes
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError, 
  baseResponse: ErrorResponse
): ErrorResponse {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      baseResponse.error.code = ErrorCodes.DUPLICATE_ENTRY;
      baseResponse.error.message = 'A record with this information already exists';
      if (config.app.env === 'development' && error.meta?.target) {
        baseResponse.error.details = {
          field: error.meta.target,
          constraint: 'unique'
        };
      }
      break;

    case 'P2025': // Record not found
      baseResponse.error.code = ErrorCodes.RESOURCE_NOT_FOUND;
      baseResponse.error.message = 'The requested resource was not found';
      break;

    case 'P2003': // Foreign key constraint violation
      baseResponse.error.code = ErrorCodes.FOREIGN_KEY_CONSTRAINT;
      baseResponse.error.message = 'Cannot perform this action due to related records';
      break;

    case 'P2014': // Required relation missing
      baseResponse.error.code = ErrorCodes.REQUIRED_RELATION_MISSING;
      baseResponse.error.message = 'Required related record is missing';
      break;

    case 'P2021': // Table does not exist
    case 'P2022': // Column does not exist
      baseResponse.error.code = ErrorCodes.DATABASE_SCHEMA_ERROR;
      baseResponse.error.message = 'Database schema error';
      break;

    default:
      baseResponse.error.code = ErrorCodes.DATABASE_ERROR;
      baseResponse.error.message = 'Database operation failed';
      if (config.app.env === 'development') {
        baseResponse.error.details = {
          code: error.code,
          meta: error.meta
        };
      }
  }

  return baseResponse;
}

/**
 * Handle Multer file upload errors
 */
function handleMulterError(error: MulterError, baseResponse: ErrorResponse): ErrorResponse {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      baseResponse.error.code = ErrorCodes.FILE_TOO_LARGE;
      baseResponse.error.message = 'File size exceeds the allowed limit';
      break;

    case 'LIMIT_FILE_COUNT':
      baseResponse.error.code = ErrorCodes.TOO_MANY_FILES;
      baseResponse.error.message = 'Too many files uploaded';
      break;

    case 'LIMIT_UNEXPECTED_FILE':
      baseResponse.error.code = ErrorCodes.UNEXPECTED_FILE_FIELD;
      baseResponse.error.message = 'Unexpected file field';
      break;

    default:
      baseResponse.error.code = ErrorCodes.FILE_UPLOAD_ERROR;
      baseResponse.error.message = 'File upload failed';
  }

  return baseResponse;
}

/**
 * Determine HTTP status code based on error type
 */
function getStatusCode(error: any): number {
  // Custom API errors
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': return 409; // Conflict
      case 'P2025': return 404; // Not Found
      case 'P2003': return 400; // Bad Request
      case 'P2014': return 400; // Bad Request
      default: return 500; // Internal Server Error
    }
  }

  // Validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return 400;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 401;
  }

  // Rate limiting
  if (error.status === 429) {
    return 429;
  }

  // JSON syntax errors
  if (error instanceof SyntaxError) {
    return 400;
  }

  // Multer errors
  if (error instanceof MulterError) {
    return 400;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Log error to console and optionally to database
 */
async function logError(
  error: any, 
  req: Request, 
  requestId: string, 
  userId?: string
): Promise<void> {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date(),
    level: getErrorLevel(error),
    message: error.message || 'Unknown error',
    error: {
      name: error.name,
      code: error.code,
      statusCode: error.statusCode
    },
    requestId,
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method
  };

  // Add stack trace in development
  if (config.app.env === 'development') {
    logEntry.stack = error.stack;
  }

  // Console logging with appropriate level
  if (logEntry.level === 'error') {
    console.error('Error:', logEntry);
  } else if (logEntry.level === 'warn') {
    console.warn('Warning:', logEntry);
  } else {
    console.info('Info:', logEntry);
  }

  // Store critical errors in audit log
  if (shouldAuditError(error)) {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'ERROR_OCCURRED',
          resource: 'SYSTEM',
          resourceId: requestId,
          userId: userId || null,
          details: {
            error: {
              message: error.message,
              code: error.code,
              name: error.name
            },
            request: {
              method: req.method,
              endpoint: req.path,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            }
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (auditError) {
      console.error('Failed to log error to audit trail:', auditError);
    }
  }
}

/**
 * Determine error logging level
 */
function getErrorLevel(error: any): ErrorLogEntry['level'] {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) return 'error';
    if (error.statusCode >= 400) return 'warn';
    return 'info';
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return 'error';
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 'warn';
  }

  return 'error';
}

/**
 * Determine if error should be stored in audit log
 */
function shouldAuditError(error: any): boolean {
  // Always audit system errors
  if (getErrorLevel(error) === 'error') {
    return true;
  }

  // Audit security-related errors
  const securityErrors = [
    ErrorCodes.AUTHENTICATION_FAILED,
    ErrorCodes.INSUFFICIENT_PERMISSIONS,
    ErrorCodes.INVALID_TOKEN,
    ErrorCodes.RATE_LIMIT_EXCEEDED
  ];

  if (error instanceof ApiError && securityErrors.includes(error.code as ErrorCodes)) {
    return true;
  }

  return false;
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 404 Not Found handler for undefined routes
 * Should be placed before the main error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(
    `Route ${req.method} ${req.path} not found`,
    404,
    ErrorCodes.ROUTE_NOT_FOUND
  );
  next(error);
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Graceful shutdown handler for uncaught exceptions
 */
export const setupGlobalErrorHandlers = (): void => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    
    // Log to audit trail if possible
    try {
      prisma.auditLog.create({
        data: {
          action: 'UNCAUGHT_EXCEPTION',
          resource: 'SYSTEM',
          details: {
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack
            }
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to log uncaught exception:', auditError);
    }

    // Graceful shutdown
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Log to audit trail if possible
    try {
      prisma.auditLog.create({
        data: {
          action: 'UNHANDLED_REJECTION',
          resource: 'SYSTEM',
          details: {
            reason: reason?.toString(),
            promise: promise?.toString()
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to log unhandled rejection:', auditError);
    }
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    try {
      await prisma.$disconnect();
      console.log('Database connections closed.');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
    
    process.exit(0);
  });

  // Handle SIGINT gracefully (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    
    try {
      await prisma.$disconnect();
      console.log('Database connections closed.');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
    
    process.exit(0);
  });
};
