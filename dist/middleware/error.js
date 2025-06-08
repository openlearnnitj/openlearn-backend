"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const config_1 = require("../config");
const common_1 = require("../utils/common");
const database_1 = require("../config/database");
/**
 * Error categorization for better handling
 */
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AUTHENTICATION"] = "AUTHENTICATION";
    ErrorCategory["AUTHORIZATION"] = "AUTHORIZATION";
    ErrorCategory["VALIDATION"] = "VALIDATION";
    ErrorCategory["DATABASE"] = "DATABASE";
    ErrorCategory["FILE_UPLOAD"] = "FILE_UPLOAD";
    ErrorCategory["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCategory["NETWORK"] = "NETWORK";
    ErrorCategory["BUSINESS_LOGIC"] = "BUSINESS_LOGIC";
    ErrorCategory["SYSTEM"] = "SYSTEM";
})(ErrorCategory || (ErrorCategory = {}));
/**
 * Main error handling middleware
 * This should be the last middleware in the Express app
 */
const errorHandler = async (error, req, res, next) => {
    // Generate unique request ID for tracking
    const requestId = generateRequestId();
    // Extract user information if available
    const user = req.user;
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
exports.errorHandler = errorHandler;
/**
 * Create standardized error response based on error type
 */
function createErrorResponse(error, requestId) {
    const baseResponse = {
        success: false,
        error: {
            code: common_1.ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
            requestId
        }
    };
    // Handle custom API errors
    if (error instanceof common_1.ApiError) {
        baseResponse.error.code = error.code;
        baseResponse.error.message = error.message;
        if (error.details && config_1.config.app.env === 'development') {
            baseResponse.error.details = error.details;
        }
        return baseResponse;
    }
    // Handle Prisma database errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error, baseResponse);
    }
    // Handle Prisma validation errors
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        baseResponse.error.code = common_1.ErrorCodes.VALIDATION_ERROR;
        baseResponse.error.message = 'Database validation error';
        if (config_1.config.app.env === 'development') {
            baseResponse.error.details = error.message;
        }
        return baseResponse;
    }
    // Handle Multer file upload errors
    if (error instanceof multer_1.MulterError) {
        return handleMulterError(error, baseResponse);
    }
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        baseResponse.error.code = common_1.ErrorCodes.AUTHENTICATION_FAILED;
        baseResponse.error.message = 'Authentication failed';
        return baseResponse;
    }
    // Handle rate limiting errors
    if (error.status === 429) {
        baseResponse.error.code = common_1.ErrorCodes.RATE_LIMIT_EXCEEDED;
        baseResponse.error.message = 'Too many requests. Please try again later.';
        return baseResponse;
    }
    // Handle syntax errors in JSON
    if (error instanceof SyntaxError && 'body' in error) {
        baseResponse.error.code = common_1.ErrorCodes.INVALID_JSON;
        baseResponse.error.message = 'Invalid JSON in request body';
        return baseResponse;
    }
    // Handle validation errors from express-validator (shouldn't reach here if using handleValidationErrors)
    if (error.errors && Array.isArray(error.errors)) {
        baseResponse.error.code = common_1.ErrorCodes.VALIDATION_ERROR;
        baseResponse.error.message = 'Validation failed';
        baseResponse.error.details = error.errors;
        return baseResponse;
    }
    // Handle network and timeout errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        baseResponse.error.code = common_1.ErrorCodes.NETWORK_ERROR;
        baseResponse.error.message = 'Network error occurred';
        return baseResponse;
    }
    // For unknown errors, provide minimal information in production
    if (config_1.config.app.env === 'production') {
        baseResponse.error.message = 'Internal server error';
    }
    else {
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
function handlePrismaError(error, baseResponse) {
    switch (error.code) {
        case 'P2002': // Unique constraint violation
            baseResponse.error.code = common_1.ErrorCodes.DUPLICATE_ENTRY;
            baseResponse.error.message = 'A record with this information already exists';
            if (config_1.config.app.env === 'development' && error.meta?.target) {
                baseResponse.error.details = {
                    field: error.meta.target,
                    constraint: 'unique'
                };
            }
            break;
        case 'P2025': // Record not found
            baseResponse.error.code = common_1.ErrorCodes.RESOURCE_NOT_FOUND;
            baseResponse.error.message = 'The requested resource was not found';
            break;
        case 'P2003': // Foreign key constraint violation
            baseResponse.error.code = common_1.ErrorCodes.FOREIGN_KEY_CONSTRAINT;
            baseResponse.error.message = 'Cannot perform this action due to related records';
            break;
        case 'P2014': // Required relation missing
            baseResponse.error.code = common_1.ErrorCodes.REQUIRED_RELATION_MISSING;
            baseResponse.error.message = 'Required related record is missing';
            break;
        case 'P2021': // Table does not exist
        case 'P2022': // Column does not exist
            baseResponse.error.code = common_1.ErrorCodes.DATABASE_SCHEMA_ERROR;
            baseResponse.error.message = 'Database schema error';
            break;
        default:
            baseResponse.error.code = common_1.ErrorCodes.DATABASE_ERROR;
            baseResponse.error.message = 'Database operation failed';
            if (config_1.config.app.env === 'development') {
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
function handleMulterError(error, baseResponse) {
    switch (error.code) {
        case 'LIMIT_FILE_SIZE':
            baseResponse.error.code = common_1.ErrorCodes.FILE_TOO_LARGE;
            baseResponse.error.message = 'File size exceeds the allowed limit';
            break;
        case 'LIMIT_FILE_COUNT':
            baseResponse.error.code = common_1.ErrorCodes.TOO_MANY_FILES;
            baseResponse.error.message = 'Too many files uploaded';
            break;
        case 'LIMIT_UNEXPECTED_FILE':
            baseResponse.error.code = common_1.ErrorCodes.UNEXPECTED_FILE_FIELD;
            baseResponse.error.message = 'Unexpected file field';
            break;
        default:
            baseResponse.error.code = common_1.ErrorCodes.FILE_UPLOAD_ERROR;
            baseResponse.error.message = 'File upload failed';
    }
    return baseResponse;
}
/**
 * Determine HTTP status code based on error type
 */
function getStatusCode(error) {
    // Custom API errors
    if (error instanceof common_1.ApiError) {
        return error.statusCode;
    }
    // Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': return 409; // Conflict
            case 'P2025': return 404; // Not Found
            case 'P2003': return 400; // Bad Request
            case 'P2014': return 400; // Bad Request
            default: return 500; // Internal Server Error
        }
    }
    // Validation errors
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
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
    if (error instanceof multer_1.MulterError) {
        return 400;
    }
    // Default to 500 for unknown errors
    return 500;
}
/**
 * Log error to console and optionally to database
 */
async function logError(error, req, requestId, userId) {
    const logEntry = {
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
    if (config_1.config.app.env === 'development') {
        logEntry.stack = error.stack;
    }
    // Console logging with appropriate level
    if (logEntry.level === 'error') {
        console.error('Error:', logEntry);
    }
    else if (logEntry.level === 'warn') {
        console.warn('Warning:', logEntry);
    }
    else {
        console.info('Info:', logEntry);
    }
    // Store critical errors in audit log
    if (shouldAuditError(error)) {
        try {
            await database_1.prisma.auditLog.create({
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
        }
        catch (auditError) {
            console.error('Failed to log error to audit trail:', auditError);
        }
    }
}
/**
 * Determine error logging level
 */
function getErrorLevel(error) {
    if (error instanceof common_1.ApiError) {
        if (error.statusCode >= 500)
            return 'error';
        if (error.statusCode >= 400)
            return 'warn';
        return 'info';
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
function shouldAuditError(error) {
    // Always audit system errors
    if (getErrorLevel(error) === 'error') {
        return true;
    }
    // Audit security-related errors
    const securityErrors = [
        common_1.ErrorCodes.AUTHENTICATION_FAILED,
        common_1.ErrorCodes.INSUFFICIENT_PERMISSIONS,
        common_1.ErrorCodes.INVALID_TOKEN,
        common_1.ErrorCodes.RATE_LIMIT_EXCEEDED
    ];
    if (error instanceof common_1.ApiError && securityErrors.includes(error.code)) {
        return true;
    }
    return false;
}
/**
 * Generate unique request ID for error tracking
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * 404 Not Found handler for undefined routes
 * Should be placed before the main error handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new common_1.ApiError(`Route ${req.method} ${req.path} not found`, 404, common_1.ErrorCodes.ROUTE_NOT_FOUND);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Graceful shutdown handler for uncaught exceptions
 */
const setupGlobalErrorHandlers = () => {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // Log to audit trail if possible
        try {
            database_1.prisma.auditLog.create({
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
        }
        catch (auditError) {
            console.error('Failed to log uncaught exception:', auditError);
        }
        // Graceful shutdown
        process.exit(1);
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Log to audit trail if possible
        try {
            database_1.prisma.auditLog.create({
                data: {
                    action: 'UNHANDLED_REJECTION',
                    resource: 'SYSTEM',
                    details: {
                        reason: reason?.toString(),
                        promise: promise?.toString()
                    }
                }
            });
        }
        catch (auditError) {
            console.error('Failed to log unhandled rejection:', auditError);
        }
    });
    // Handle SIGTERM gracefully
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully...');
        try {
            await database_1.prisma.$disconnect();
            console.log('Database connections closed.');
        }
        catch (error) {
            console.error('Error closing database connections:', error);
        }
        process.exit(0);
    });
    // Handle SIGINT gracefully (Ctrl+C)
    process.on('SIGINT', async () => {
        console.log('SIGINT received, shutting down gracefully...');
        try {
            await database_1.prisma.$disconnect();
            console.log('Database connections closed.');
        }
        catch (error) {
            console.error('Error closing database connections:', error);
        }
        process.exit(0);
    });
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
