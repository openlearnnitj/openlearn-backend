"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtils = exports.Logger = exports.PaginationUtils = exports.ResponseUtils = exports.ApiError = exports.ErrorCodes = void 0;
exports.createApiError = createApiError;
/**
 * Standardized error codes for the application
 */
var ErrorCodes;
(function (ErrorCodes) {
    // General errors
    ErrorCodes["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCodes["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCodes["NOT_FOUND"] = "NOT_FOUND";
    ErrorCodes["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCodes["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCodes["FORBIDDEN"] = "FORBIDDEN";
    ErrorCodes["CONFLICT"] = "CONFLICT";
    // Authentication errors
    ErrorCodes["AUTHENTICATION_REQUIRED"] = "AUTHENTICATION_REQUIRED";
    ErrorCodes["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    ErrorCodes["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCodes["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCodes["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCodes["EMAIL_NOT_VERIFIED"] = "EMAIL_NOT_VERIFIED";
    ErrorCodes["ACCOUNT_INACTIVE"] = "ACCOUNT_INACTIVE";
    // Authorization errors
    ErrorCodes["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCodes["ACCESS_DENIED"] = "ACCESS_DENIED";
    // User/Resource errors
    ErrorCodes["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCodes["USER_ALREADY_EXISTS"] = "USER_ALREADY_EXISTS";
    ErrorCodes["EMAIL_ALREADY_EXISTS"] = "EMAIL_ALREADY_EXISTS";
    ErrorCodes["USERNAME_ALREADY_EXISTS"] = "USERNAME_ALREADY_EXISTS";
    ErrorCodes["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCodes["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    // Database errors
    ErrorCodes["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCodes["DATABASE_CONNECTION_ERROR"] = "DATABASE_CONNECTION_ERROR";
    ErrorCodes["DATABASE_SCHEMA_ERROR"] = "DATABASE_SCHEMA_ERROR";
    ErrorCodes["FOREIGN_KEY_CONSTRAINT"] = "FOREIGN_KEY_CONSTRAINT";
    ErrorCodes["REQUIRED_RELATION_MISSING"] = "REQUIRED_RELATION_MISSING";
    // Rate limiting errors
    ErrorCodes["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCodes["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    // File upload errors
    ErrorCodes["FILE_UPLOAD_ERROR"] = "FILE_UPLOAD_ERROR";
    ErrorCodes["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCodes["INVALID_FILE_TYPE"] = "INVALID_FILE_TYPE";
    ErrorCodes["TOO_MANY_FILES"] = "TOO_MANY_FILES";
    ErrorCodes["UNEXPECTED_FILE_FIELD"] = "UNEXPECTED_FILE_FIELD";
    // Network errors
    ErrorCodes["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCodes["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    // API errors
    ErrorCodes["INVALID_JSON"] = "INVALID_JSON";
    ErrorCodes["PAYLOAD_TOO_LARGE"] = "PAYLOAD_TOO_LARGE";
    ErrorCodes["ROUTE_NOT_FOUND"] = "ROUTE_NOT_FOUND";
    ErrorCodes["METHOD_NOT_ALLOWED"] = "METHOD_NOT_ALLOWED";
    // Security errors
    ErrorCodes["IP_NOT_ALLOWED"] = "IP_NOT_ALLOWED";
    ErrorCodes["API_KEY_REQUIRED"] = "API_KEY_REQUIRED";
    ErrorCodes["INVALID_API_KEY"] = "INVALID_API_KEY";
    ErrorCodes["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));
/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, statusCode = 500, code = ErrorCodes.INTERNAL_SERVER_ERROR, details) {
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
exports.ApiError = ApiError;
/**
 * Helper function to create API errors
 */
function createApiError(message, statusCode = 500, code = ErrorCodes.INTERNAL_SERVER_ERROR, details) {
    return new ApiError(message, statusCode, code, details);
}
/**
 * Standardized API response utilities
 */
class ResponseUtils {
    /**
     * Create a success response
     */
    static success(message, data, meta) {
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
    static error(message, code = 'UNKNOWN_ERROR', details, meta) {
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
    static paginated(message, data, pagination) {
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
    static created(message, data) {
        return this.success(message, data);
    }
    /**
     * Create a response for updated resources
     */
    static updated(message, data) {
        return this.success(message, data);
    }
    /**
     * Create a response for deleted resources
     */
    static deleted(message = 'Resource deleted successfully') {
        return this.success(message);
    }
    /**
     * Create a not found response
     */
    static notFound(message = 'Resource not found') {
        return this.error(message, 'NOT_FOUND');
    }
    /**
     * Create an unauthorized response
     */
    static unauthorized(message = 'Unauthorized access') {
        return this.error(message, 'UNAUTHORIZED');
    }
    /**
     * Create a forbidden response
     */
    static forbidden(message = 'Forbidden access') {
        return this.error(message, 'FORBIDDEN');
    }
    /**
     * Create a validation error response
     */
    static validationError(message, details) {
        return this.error(message, 'VALIDATION_ERROR', details);
    }
    /**
     * Create a server error response
     */
    static serverError(message = 'Internal server error', details) {
        return this.error(message, 'INTERNAL_SERVER_ERROR', details);
    }
}
exports.ResponseUtils = ResponseUtils;
/**
 * Pagination utilities
 */
class PaginationUtils {
    /**
     * Calculate pagination parameters
     */
    static calculatePagination(page = 1, limit = 10) {
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
    static createMeta(page, limit, total) {
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
exports.PaginationUtils = PaginationUtils;
/**
 * Logging utilities
 */
class Logger {
    static log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
    }
    static info(message, ...args) {
        this.log('info', message, ...args);
    }
    static warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    static error(message, error, ...args) {
        this.log('error', message, error, ...args);
    }
    static debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, ...args);
        }
    }
}
exports.Logger = Logger;
/**
 * File utilities
 */
class FileUtils {
    /**
     * Get file extension from filename
     */
    static getExtension(filename) {
        return filename.split('.').pop()?.toLowerCase() || '';
    }
    /**
     * Check if file type is allowed
     */
    static isAllowedFileType(filename, allowedTypes) {
        const extension = this.getExtension(filename);
        return allowedTypes.includes(extension);
    }
    /**
     * Generate unique filename
     */
    static generateUniqueFilename(originalName) {
        const extension = this.getExtension(originalName);
        const nameWithoutExt = originalName.replace(`.${extension}`, '');
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
    }
    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}
exports.FileUtils = FileUtils;
