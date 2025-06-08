import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { ErrorCodes, createApiError } from '../utils/common';

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
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    return next(createApiError(
      'Validation failed',
      400,
      ErrorCodes.VALIDATION_ERROR,
      { errors: validationErrors }
    ));
  }

  next();
};

/**
 * Common validation rules for reuse across endpoints
 */
export const commonValidations = {
  // Email validation
  email: body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .toLowerCase(),

  // Password validation with strength requirements
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Username validation
  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .toLowerCase(),

  // Name validation
  firstName: body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  // Phone number validation
  phone: body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),

  // Date validation
  dateOfBirth: body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Valid date of birth is required (YYYY-MM-DD)')
    .custom((value) => {
      if (!value) return true; // Skip validation if not provided
      
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
  uuid: (field: string) => param(field)
    .isUUID()
    .withMessage(`Valid ${field} is required`),

  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  // Search query validation
  searchQuery: query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  // Text content validation
  title: (maxLength: number = 100) => body('title')
    .trim()
    .isLength({ min: 1, max: maxLength })
    .withMessage(`Title is required and must be less than ${maxLength} characters`),

  content: (maxLength: number = 10000) => body('content')
    .trim()
    .isLength({ min: 1, max: maxLength })
    .withMessage(`Content is required and must be less than ${maxLength} characters`),

  // URL validation
  url: (field: string) => body(field)
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage(`Valid ${field} URL is required`),

  // Role validation
  role: body('role')
    .isIn(['PIONEER', 'LUMINARY', 'PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER'])
    .withMessage('Valid role is required'),

  // Boolean validation
  boolean: (field: string) => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean value`)
    .toBoolean(),

  // Array validation
  array: (field: string, itemValidator?: (value: any) => boolean | Promise<boolean>) => {
    const validation = body(field)
      .isArray({ min: 0, max: 100 })
      .withMessage(`${field} must be an array with maximum 100 items`);
    
    if (itemValidator) {
      return [validation, body(`${field}.*`).custom(itemValidator)];
    }
    return validation;
  },

  // File validation (for multer uploads)
  file: {
    image: (req: Request, res: Response, next: NextFunction) => {
      if (!req.file) {
        return next(createApiError(
          'Image file is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(createApiError(
          'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      if (req.file.size > maxSize) {
        return next(createApiError(
          'File too large. Maximum size is 5MB.',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      next();
    },

    document: (req: Request, res: Response, next: NextFunction) => {
      if (!req.file) {
        return next(createApiError(
          'Document file is required',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(createApiError(
          'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      if (req.file.size > maxSize) {
        return next(createApiError(
          'File too large. Maximum size is 10MB.',
          400,
          ErrorCodes.VALIDATION_ERROR
        ));
      }

      next();
    }
  }
};

/**
 * ✅ MOVE THIS BEFORE userValidations
 * Optional validation rules for partial updates
 */
export const optionalValidations = {
  firstName: body('firstName')
    .optional()  // ✅ Make it optional
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: body('lastName')
    .optional()  // ✅ Make it optional
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  username: body('username')
    .optional()  // ✅ Make it optional
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .toLowerCase(),

  phone: body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),

  bio: body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),

  githubProfile: body('githubProfile')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid GitHub profile URL is required'),

  linkedinProfile: body('linkedinProfile')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid LinkedIn profile URL is required'),

  website: body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid website URL is required'),

  dateOfBirth: body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Valid date of birth is required (YYYY-MM-DD)')
    .custom((value) => {
      if (!value) return true; // Skip validation if not provided
      
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
    })
};

/**
 * Authentication validations
 */
export const authValidations = {
  register: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.username,
    commonValidations.firstName,
    commonValidations.lastName,
    commonValidations.phone,
    commonValidations.dateOfBirth,
    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  forgotPassword: [
    commonValidations.email,
    handleValidationErrors
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    commonValidations.password,
    handleValidationErrors
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidations.password,
    handleValidationErrors
  ],

  refreshToken: [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
    handleValidationErrors
  ]
};

/**
 * ✅ NOW this can use optionalValidations since it's declared above
 * User profile validations
 */
export const userValidations = {
  updateProfile: [
    optionalValidations.firstName,     // ✅ Optional - now works!
    optionalValidations.lastName,      // ✅ Optional - now works!
    optionalValidations.username,      // ✅ Optional
    optionalValidations.phone,         // ✅ Optional
    optionalValidations.bio,           // ✅ Optional
    optionalValidations.githubProfile, // ✅ Optional
    optionalValidations.linkedinProfile, // ✅ Optional
    optionalValidations.website,       // ✅ Optional
    optionalValidations.dateOfBirth,   // ✅ Optional
    handleValidationErrors
  ],

  getUserById: [
    commonValidations.uuid('userId'),
    handleValidationErrors
  ],

  searchUsers: [
    commonValidations.searchQuery,
    commonValidations.page,
    commonValidations.limit,
    handleValidationErrors
  ]
};

/**
 * Blog post validations
 */
export const blogValidations = {
  createPost: [
    commonValidations.title(200),
    commonValidations.content(50000),
    body('excerpt')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Excerpt must be less than 500 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    body('tags.*')
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    commonValidations.boolean('isPublished'),
    handleValidationErrors
  ],

  updatePost: [
    commonValidations.uuid('postId'),
    commonValidations.title(200),
    commonValidations.content(50000),
    body('excerpt')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Excerpt must be less than 500 characters'),
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    body('tags.*')
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters'),
    commonValidations.boolean('isPublished'),
    handleValidationErrors
  ],

  getPost: [
    commonValidations.uuid('postId'),
    handleValidationErrors
  ],

  deletePost: [
    commonValidations.uuid('postId'),
    handleValidationErrors
  ],

  searchPosts: [
    commonValidations.searchQuery,
    query('tag')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Tag filter must be between 1 and 30 characters'),
    query('author')
      .optional()
      .isUUID()
      .withMessage('Valid author ID is required'),
    commonValidations.page,
    commonValidations.limit,
    handleValidationErrors
  ]
};

/**
 * Project validations
 */
export const projectValidations = {
  createProject: [
    commonValidations.title(100),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('requirements')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Requirements must be less than 1000 characters'),
    body('difficultyLevel')
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Valid difficulty level is required'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max participants must be between 1 and 100'),
    body('deadline')
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
    handleValidationErrors
  ],

  submitProject: [
    commonValidations.uuid('projectId'),
    body('submissionUrl')
      .optional()
      .isURL()
      .withMessage('Valid submission URL is required'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    handleValidationErrors
  ]
};

/**
 * Comment validations
 */
export const commentValidations = {
  createComment: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters'),
    body('parentId')
      .optional()
      .isUUID()
      .withMessage('Valid parent comment ID is required'),
    handleValidationErrors
  ],

  updateComment: [
    commonValidations.uuid('commentId'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters'),
    handleValidationErrors
  ]
};

/**
 * Admin validations
 */
export const adminValidations = {
  assignRole: [
    commonValidations.uuid('userId'),
    commonValidations.role,
    handleValidationErrors
  ],

  createRole: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Role name is required and must be less than 50 characters')
      .matches(/^[A-Z_]+$/)
      .withMessage('Role name must be uppercase with underscores only'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description must be less than 200 characters'),
    handleValidationErrors
  ],

  assignPermission: [
    commonValidations.uuid('roleId'),
    body('permissionIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('At least one permission ID is required, maximum 50 allowed'),
    body('permissionIds.*')
      .isUUID()
      .withMessage('Each permission ID must be a valid UUID'),
    handleValidationErrors
  ]
};

/**
 * Middleware factory for custom validation rules
 */
export const createCustomValidation = (
  validator: (value: any, req: Request) => boolean | Promise<boolean>,
  message: string
) => {
  return body().custom(async (value, { req }) => {
    const isValid = await validator(value, req as Request);
    if (!isValid) {
      throw new Error(message);
    }
    return true;
  });
};

/**
 * Sanitization middleware
 * Cleans and normalizes input data
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
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
        req.query[key] = (req.query[key] as string).trim();
      }
    }
  }

  next();
};
