import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * Extended Express Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
    emailVerified: boolean;
    isActive: boolean;
    roles: Array<{
      id: string;
      name: string;
      level: number;
      permissions: Array<{
        name: string;
        resource: string;
        action: string;
      }>;
    }>;
    permissions: Array<{
      name: string;
      resource: string;
      action: string;
    }>;
  };
}

/**
 * JWT Payload structure
 */
export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  username?: string;
  roles: string[];
  type: 'access' | 'refresh';
}

/**
 * API Response structure for consistent responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Authentication DTOs
 */
export interface RegisterDTO {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  studentId?: string;
  isAlumni?: boolean;
  role?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Role and Permission types
 */
export interface RolePermission {
  name: string;
  resource: string;
  action: string;
}

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  level: number;
  permissions: RolePermission[];
}

/**
 * Blog Post DTOs
 */
export interface CreateBlogPostDTO {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
}

export interface UpdateBlogPostDTO extends Partial<CreateBlogPostDTO> {
  id: string;
}

/**
 * Project DTOs
 */
export interface CreateProjectDTO {
  title: string;
  description: string;
  requirements?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category: string;
  tags?: string[];
  maxPoints?: number;
  dueDate?: Date;
}

export interface ProjectSubmissionDTO {
  projectId: string;
  title: string;
  description?: string;
  repositoryUrl?: string;
  liveUrl?: string;
  files?: string[];
}

/**
 * Error types
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Audit Log types
 */
export interface AuditLogData {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
