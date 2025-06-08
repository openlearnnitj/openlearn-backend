"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = exports.createCustomValidation = exports.adminValidations = exports.commentValidations = exports.projectValidations = exports.blogValidations = exports.userValidations = exports.authValidations = exports.commonValidations = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const common_1 = require("../utils/common");
/**
 * Validation middleware for OpenLearn backend
 *
 * This module provides comprehensive input validation using express-validator:
 * - Request body validation
 * - Route parameter validation
 * - Query parameter validation
 * - File upload validation
 * - Custom validation rules
 * - Sanitization helpers
 */
/**
 * Middleware to handle validation results
 * Must be used after validation chains to process validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined
        }));
        return next((0, common_1.createApiError)('Validation failed', 400, common_1.ErrorCodes.VALIDATION_ERROR, { errors: validationErrors }));
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Common validation rules for reuse across endpoints
 */
exports.commonValidations = {
    // Email validation
    email: (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail()
        .toLowerCase(),
    // Password validation with strength requirements
    password: (0, express_validator_1.body)('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    // Username validation
    username: (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
        .toLowerCase(),
    // Name validation
    firstName: (0, express_validator_1.body)('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be less than 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    lastName: (0, express_validator_1.body)('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be less than 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    // Phone number validation
    phone: (0, express_validator_1.body)('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
    // Date validation
    dateOfBirth: (0, express_validator_1.body)('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Valid date of birth is required (YYYY-MM-DD)')
        .custom((value) => {
        const date = new Date(value);
        const now = new Date();
        const minAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
        const maxAge = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
        if (date > minAge) {
            throw new Error('Must be at least 13 years old');
        }
        if (date < maxAge) {
            throw new Error('Invalid date of birth');
        }
        return true;
    }),
    // UUID validation for IDs
    uuid: (field) => (0, express_validator_1.param)(field)
        .isUUID()
        .withMessage(`Valid ${field} is required`),
    // Pagination validation
    page: (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    limit: (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    // Search query validation
    searchQuery: (0, express_validator_1.query)('q')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),
    // Text content validation
    title: (maxLength = 100) => (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 1, max: maxLength })
        .withMessage(`Title is required and must be less than ${maxLength} characters`),
    content: (maxLength = 10000) => (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 1, max: maxLength })
        .withMessage(`Content is required and must be less than ${maxLength} characters`),
    // URL validation
    url: (field) => (0, express_validator_1.body)(field)
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage(`Valid ${field} URL is required`),
    // Role validation
    role: (0, express_validator_1.body)('role')
        .isIn(['PIONEER', 'LUMINARY', 'PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER'])
        .withMessage('Valid role is required'),
    // Boolean validation
    boolean: (field) => (0, express_validator_1.body)(field)
        .optional()
        .isBoolean()
        .withMessage(`${field} must be a boolean value`)
        .toBoolean(),
    // Array validation
    array: (field, itemValidator) => {
        const validation = (0, express_validator_1.body)(field)
            .isArray({ min: 0, max: 100 })
            .withMessage(`${field} must be an array with maximum 100 items`);
        if (itemValidator) {
            return [validation, (0, express_validator_1.body)(`${field}.*`).custom(itemValidator)];
        }
        return validation;
    },
    // File validation (for multer uploads)
    file: {
        image: (req, res, next) => {
            if (!req.file) {
                return next((0, common_1.createApiError)('Image file is required', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (!allowedTypes.includes(req.file.mimetype)) {
                return next((0, common_1.createApiError)('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            if (req.file.size > maxSize) {
                return next((0, common_1.createApiError)('File too large. Maximum size is 5MB.', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            next();
        },
        document: (req, res, next) => {
            if (!req.file) {
                return next((0, common_1.createApiError)('Document file is required', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (!allowedTypes.includes(req.file.mimetype)) {
                return next((0, common_1.createApiError)('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            if (req.file.size > maxSize) {
                return next((0, common_1.createApiError)('File too large. Maximum size is 10MB.', 400, common_1.ErrorCodes.VALIDATION_ERROR));
            }
            next();
        }
    }
};
/**
 * Validation chains for specific endpoints
 */
// Authentication validations
exports.authValidations = {
    register: [
        exports.commonValidations.email,
        exports.commonValidations.password,
        exports.commonValidations.username,
        exports.commonValidations.firstName,
        exports.commonValidations.lastName,
        exports.commonValidations.phone,
        exports.commonValidations.dateOfBirth,
        exports.handleValidationErrors
    ],
    login: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail(),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required'),
        exports.handleValidationErrors
    ],
    forgotPassword: [
        exports.commonValidations.email,
        exports.handleValidationErrors
    ],
    resetPassword: [
        (0, express_validator_1.body)('token')
            .notEmpty()
            .withMessage('Reset token is required'),
        exports.commonValidations.password,
        exports.handleValidationErrors
    ],
    changePassword: [
        (0, express_validator_1.body)('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        exports.commonValidations.password,
        exports.handleValidationErrors
    ],
    refreshToken: [
        (0, express_validator_1.body)('refreshToken')
            .notEmpty()
            .withMessage('Refresh token is required'),
        exports.handleValidationErrors
    ]
};
// User profile validations
exports.userValidations = {
    updateProfile: [
        exports.commonValidations.firstName,
        exports.commonValidations.lastName,
        exports.commonValidations.phone,
        exports.commonValidations.dateOfBirth,
        (0, express_validator_1.body)('bio')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Bio must be less than 500 characters'),
        exports.commonValidations.url('website'),
        exports.commonValidations.url('linkedinUrl'),
        exports.commonValidations.url('githubUrl'),
        exports.handleValidationErrors
    ],
    getUserById: [
        exports.commonValidations.uuid('userId'),
        exports.handleValidationErrors
    ],
    searchUsers: [
        exports.commonValidations.searchQuery,
        exports.commonValidations.page,
        exports.commonValidations.limit,
        exports.handleValidationErrors
    ]
};
// Blog post validations
exports.blogValidations = {
    createPost: [
        exports.commonValidations.title(200),
        exports.commonValidations.content(50000),
        (0, express_validator_1.body)('excerpt')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Excerpt must be less than 500 characters'),
        (0, express_validator_1.body)('tags')
            .optional()
            .isArray({ max: 10 })
            .withMessage('Maximum 10 tags allowed'),
        (0, express_validator_1.body)('tags.*')
            .trim()
            .isLength({ min: 1, max: 30 })
            .withMessage('Each tag must be between 1 and 30 characters'),
        exports.commonValidations.boolean('isPublished'),
        exports.handleValidationErrors
    ],
    updatePost: [
        exports.commonValidations.uuid('postId'),
        exports.commonValidations.title(200),
        exports.commonValidations.content(50000),
        (0, express_validator_1.body)('excerpt')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Excerpt must be less than 500 characters'),
        (0, express_validator_1.body)('tags')
            .optional()
            .isArray({ max: 10 })
            .withMessage('Maximum 10 tags allowed'),
        (0, express_validator_1.body)('tags.*')
            .trim()
            .isLength({ min: 1, max: 30 })
            .withMessage('Each tag must be between 1 and 30 characters'),
        exports.commonValidations.boolean('isPublished'),
        exports.handleValidationErrors
    ],
    getPost: [
        exports.commonValidations.uuid('postId'),
        exports.handleValidationErrors
    ],
    deletePost: [
        exports.commonValidations.uuid('postId'),
        exports.handleValidationErrors
    ],
    searchPosts: [
        exports.commonValidations.searchQuery,
        (0, express_validator_1.query)('tag')
            .optional()
            .trim()
            .isLength({ min: 1, max: 30 })
            .withMessage('Tag filter must be between 1 and 30 characters'),
        (0, express_validator_1.query)('author')
            .optional()
            .isUUID()
            .withMessage('Valid author ID is required'),
        exports.commonValidations.page,
        exports.commonValidations.limit,
        exports.handleValidationErrors
    ]
};
// Project validations
exports.projectValidations = {
    createProject: [
        exports.commonValidations.title(100),
        (0, express_validator_1.body)('description')
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage('Description must be between 10 and 2000 characters'),
        (0, express_validator_1.body)('requirements')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Requirements must be less than 1000 characters'),
        (0, express_validator_1.body)('difficultyLevel')
            .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
            .withMessage('Valid difficulty level is required'),
        (0, express_validator_1.body)('maxParticipants')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Max participants must be between 1 and 100'),
        (0, express_validator_1.body)('deadline')
            .optional()
            .isISO8601()
            .withMessage('Valid deadline date is required')
            .custom((value) => {
            const deadline = new Date(value);
            const now = new Date();
            if (deadline <= now) {
                throw new Error('Deadline must be in the future');
            }
            return true;
        }),
        exports.handleValidationErrors
    ],
    submitProject: [
        exports.commonValidations.uuid('projectId'),
        (0, express_validator_1.body)('submissionUrl')
            .optional()
            .isURL()
            .withMessage('Valid submission URL is required'),
        (0, express_validator_1.body)('notes')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Notes must be less than 1000 characters'),
        exports.handleValidationErrors
    ]
};
// Comment validations
exports.commentValidations = {
    createComment: [
        (0, express_validator_1.body)('content')
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage('Comment content must be between 1 and 1000 characters'),
        (0, express_validator_1.body)('parentId')
            .optional()
            .isUUID()
            .withMessage('Valid parent comment ID is required'),
        exports.handleValidationErrors
    ],
    updateComment: [
        exports.commonValidations.uuid('commentId'),
        (0, express_validator_1.body)('content')
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage('Comment content must be between 1 and 1000 characters'),
        exports.handleValidationErrors
    ]
};
// Admin validations
exports.adminValidations = {
    assignRole: [
        exports.commonValidations.uuid('userId'),
        exports.commonValidations.role,
        exports.handleValidationErrors
    ],
    createRole: [
        (0, express_validator_1.body)('name')
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Role name is required and must be less than 50 characters')
            .matches(/^[A-Z_]+$/)
            .withMessage('Role name must be uppercase with underscores only'),
        (0, express_validator_1.body)('description')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Description must be less than 200 characters'),
        exports.handleValidationErrors
    ],
    assignPermission: [
        exports.commonValidations.uuid('roleId'),
        (0, express_validator_1.body)('permissionIds')
            .isArray({ min: 1, max: 50 })
            .withMessage('At least one permission ID is required, maximum 50 allowed'),
        (0, express_validator_1.body)('permissionIds.*')
            .isUUID()
            .withMessage('Each permission ID must be a valid UUID'),
        exports.handleValidationErrors
    ]
};
/**
 * Middleware factory for custom validation rules
 */
const createCustomValidation = (validator, message) => {
    return (0, express_validator_1.body)().custom(async (value, { req }) => {
        const isValid = await validator(value, req);
        if (!isValid) {
            throw new Error(message);
        }
        return true;
    });
};
exports.createCustomValidation = createCustomValidation;
/**
 * Sanitization middleware
 * Cleans and normalizes input data
 */
const sanitizeRequest = (req, res, next) => {
    // Trim string values in body
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    // Trim string values in query
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        }
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
