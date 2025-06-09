# OpenLearn Backend API Documentation

## Overview

The OpenLearn API is a TypeScript-based RESTful API built with Express.js, Prisma ORM, and PostgreSQL. It provides comprehensive authentication, authorization, and content management features for the OpenLearn educational platform.

**Base URL:** `http://localhost:3001/api` (Development)

**Authentication:** Bearer JWT tokens

**Content Type:** `application/json`

---

## Documentation Structure

- **[Authentication API](./AUTH_API_DOCUMENTATION.md)** - Complete authentication endpoints documentation
- **Main API Documentation** - This file (comprehensive API reference)

---

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Authentication Endpoints](#authentication-endpoints)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [Security Considerations](#security-considerations)

---

## Authentication Overview

The OpenLearn API uses JWT (JSON Web Tokens) for authentication with a dual-token system:

- **Access Token**: Short-lived (15 minutes) token for API access
- **Refresh Token**: Long-lived (7 days) token for obtaining new access tokens

### User Roles Hierarchy

The platform implements a role-based access control (RBAC) system with the following hierarchy:

1. **PIONEER** - Students/Learners (base level)
2. **LUMINARY** - Top-performing students
3. **PATHFINDER** - Teachers/Mentors
4. **CHIEF_PATHFINDER** - Department heads/Senior mentors
5. **GRAND_PATHFINDER** - System administrators

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database
    
    Client->>API: POST /api/auth/register
    API->>Database: Create user
    API->>Client: { success, data: { user, tokens } }
    
    Client->>API: POST /api/auth/login
    API->>Database: Verify credentials
    API->>Client: { success, data: { user, tokens } }
    
    Client->>API: GET /api/auth/profile (with Bearer token)
    API->>Database: Verify token & fetch user
    API->>Client: { success, data: { user } }
    
    Note over Client,API: When access token expires
    Client->>API: POST /api/auth/refresh
    API->>Client: { success, data: { tokens } }
```

---

## Error Handling

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {
      // Additional error information
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_REQUIRED` | 401 | No valid token provided |
| `INVALID_TOKEN` | 401 | Token is malformed or invalid |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **General endpoints**: 100 requests per 15 minutes per IP
- **Upload endpoints**: 10 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Authentication Endpoints

### 1. User Registration

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePassword123!",
  "username": "student123",
  "firstName": "John",
  "lastName": "Doe",
  "studentId": "2024-CS-001",
  "role": "PIONEER"
}
```

**Request Fields:**
- `email` (required): Valid email address
- `password` (required): Strong password (min 8 chars, uppercase, lowercase, number, special char)
- `username` (optional): Unique username (3-30 chars, alphanumeric + underscore)
- `firstName` (required): User's first name
- `lastName` (required): User's last name
- `studentId` (optional): Student ID for students (format: YYYY-DEPT-NNN)
- `role` (optional): User role, defaults to "PIONEER"

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clp123abc-def4-5678-9012-123456789abc",
      "email": "student@college.edu",
      "username": "student123",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "isActive": true,
      "roles": [
        {
          "id": "role123",
          "name": "PIONEER",
          "level": 1
        }
      ]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses:**
- `400`: Validation errors (weak password, invalid email, missing fields)
- `409`: Email already registered
- `429`: Rate limit exceeded

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT tokens

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clp123abc-def4-5678-9012-123456789abc",
      "email": "student@college.edu",
      "username": "student123",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true,
      "isActive": true,
      "roles": [
        {
          "id": "role123",
          "name": "PIONEER",
          "level": 1,
          "permissions": [
            {
              "name": "READ_BLOG",
              "resource": "blog",
              "action": "read"
            }
          ]
        }
      ]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `403`: Account inactive or email not verified (if required)
- `429`: Rate limit exceeded

---

### 3. Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Description:** Obtain new access token using refresh token

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400`: Missing refresh token
- `401`: Invalid or expired refresh token
- `429`: Rate limit exceeded

---

### 4. User Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate refresh token and logout user

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses:**
- `401`: Invalid or missing token
- `429`: Rate limit exceeded

---

### 5. Password Reset Request

**Endpoint:** `POST /api/auth/request-password-reset`

**Description:** Request password reset email (always returns success to prevent email enumeration)

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "student@college.edu"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

**Error Responses:**
- `400`: Invalid email format
- `429`: Rate limit exceeded

---

### 6. Password Reset Completion

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Complete password reset using token from email

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "token": "password-reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Error Responses:**
- `400`: Missing token/password or weak password
- `401`: Invalid or expired reset token
- `429`: Rate limit exceeded

---

### 7. Email Verification

**Endpoint:** `POST /api/auth/verify-email`

**Description:** Verify email address using token from email

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "token": "email-verification-token-from-email"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400`: Missing verification token
- `401`: Invalid or expired verification token
- `429`: Rate limit exceeded

---

### 8. Resend Email Verification

**Endpoint:** `POST /api/auth/resend-verification`

**Description:** Resend email verification link

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**Error Responses:**
- `401`: Invalid or missing token
- `409`: Email already verified
- `429`: Rate limit exceeded

---

### 9. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Description:** Get current user's profile information

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clp123abc-def4-5678-9012-123456789abc",
    "email": "student@college.edu",
    "username": "student123",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "profile": {
      "bio": "Computer Science student passionate about AI",
      "avatar": "https://example.com/avatar.jpg",
      "linkedinProfile": "https://linkedin.com/in/johndoe",
      "githubProfile": "https://github.com/johndoe"
    },
    "roles": [
      {
        "id": "role123",
        "name": "PIONEER",
        "level": 1,
        "permissions": [
          {
            "name": "READ_BLOG",
            "resource": "blog",
            "action": "read"
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**
- `401`: Invalid or missing token
- `429`: Rate limit exceeded

---

### 10. Update User Profile

**Endpoint:** `PUT /api/auth/profile`

**Description:** Update current user's profile information

**Authentication:** Required (Bearer token + Email verified)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "username": "johnsmith",
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio text",
  "avatar": "https://example.com/new-avatar.jpg",
  "linkedinProfile": "https://linkedin.com/in/johnsmith",
  "githubProfile": "https://github.com/johnsmith"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "clp123abc-def4-5678-9012-123456789abc",
    "email": "student@college.edu",
    "username": "johnsmith",
    "firstName": "John",
    "lastName": "Smith",
    "profile": {
      "bio": "Updated bio text",
      "avatar": "https://example.com/new-avatar.jpg",
      "linkedinProfile": "https://linkedin.com/in/johnsmith",
      "githubProfile": "https://github.com/johnsmith"
    }
  }
}
```

**Error Responses:**
- `400`: Validation errors (username taken, invalid URL format)
- `401`: Invalid or missing token
- `403`: Email verification required
- `429`: Rate limit exceeded

---

### 11. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Description:** Change password for authenticated user

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Missing passwords or weak new password
- `401`: Invalid token or incorrect current password
- `429`: Rate limit exceeded

---

### 12. Get User Activity

**Endpoint:** `GET /api/auth/activity`

**Description:** Get user's activity/audit logs

**Authentication:** Required (Bearer token + Email verified)

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Example:** `GET /api/auth/activity?page=1&limit=20`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity123",
        "action": "LOGIN",
        "resource": "auth",
        "details": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        },
        "timestamp": "2024-01-20T14:45:00.000Z"
      },
      {
        "id": "activity124",
        "action": "PROFILE_UPDATE",
        "resource": "user",
        "details": {
          "fieldsChanged": ["firstName", "bio"]
        },
        "timestamp": "2024-01-20T13:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
- `401`: Invalid or missing token
- `403`: Email verification required
- `429`: Rate limit exceeded

---

## Frontend Integration Examples

### Setting up API Client

```typescript
// api/client.ts
class ApiClient {
  private baseUrl = 'http://localhost:3000/api';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle token expiration
      if (response.status === 401 && data.error?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // Retry original request with new token
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return retryResponse.json();
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Clear invalid tokens
    this.clearTokens();
    return false;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Auth methods
  async register(userData: RegisterData) {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.tokens) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response;
  }

  async login(credentials: LoginData) {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.tokens) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response;
  }

  async logout() {
    if (this.refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    }
    this.clearTokens();
  }

  async getProfile() {
    return this.request<ProfileResponse>('/auth/profile');
  }

  async updateProfile(profileData: UpdateProfileData) {
    return this.request<ProfileResponse>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const apiClient = new ApiClient();
```

### React Hook for Authentication

```typescript
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  roles: Array<{
    name: string;
    level: number;
    permissions: Array<{
      name: string;
      resource: string;
      action: string;
    }>;
  }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const initAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getProfile();
          if (response.success) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          apiClient.clearTokens();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login({ email, password });
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiClient.register(userData);
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
      apiClient.clearTokens();
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const response = await apiClient.updateProfile(data);
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.roles.some(role =>
      role.permissions.some(perm => perm.name === permission)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some(role => role.name === roleName);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      hasPermission,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Login Component Example

```typescript
// components/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // Redirect to dashboard or desired page
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
```

### Protected Route Component

```typescript
// components/ProtectedRoute.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  requireEmailVerification = false,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  if (requireEmailVerification && !user.emailVerified) {
    return <div>Please verify your email to access this page.</div>;
  }

  if (requiredRole && !user.roles.some(role => role.name === requiredRole)) {
    return <div>You don't have permission to access this page.</div>;
  }

  if (requiredPermission && !user.roles.some(role =>
    role.permissions.some(perm => perm.name === requiredPermission)
  )) {
    return <div>You don't have permission to access this page.</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

---

## Security Considerations

### For Frontend Developers

1. **Token Storage**: Store tokens in `localStorage` or `sessionStorage`, never in cookies accessible to JavaScript
2. **HTTPS Only**: Always use HTTPS in production to protect token transmission
3. **Token Expiration**: Implement automatic token refresh to maintain user sessions
4. **Logout on Error**: Clear tokens and redirect to login on authentication errors
5. **Input Validation**: Always validate user input on the frontend (server also validates)
6. **Error Handling**: Don't expose sensitive information in error messages to users

### Security Headers

The API automatically sets the following security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: no-referrer
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

### CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (React development server)
- `http://localhost:3001` (Alternative development port)
- Production domain (when deployed)

### Rate Limiting Best Practices

- Implement exponential backoff for failed requests
- Show user-friendly messages when rate limits are exceeded
- Cache successful responses when appropriate
- Use debouncing for search/filter inputs

---

## Support and Troubleshooting

### Common Issues

1. **Token Expired Errors**: Implement automatic token refresh
2. **CORS Errors**: Ensure your frontend URL is in the allowed origins list
3. **Rate Limit Exceeded**: Implement request throttling and user feedback
4. **Email Verification**: Check spam folder, implement resend functionality

### Debugging Tips

1. Check browser network tab for actual HTTP status codes
2. Verify token format and expiration using JWT debuggers
3. Use API testing tools (Postman, Insomnia) to isolate frontend issues
4. Check server logs for detailed error information

### Development Mode Features

In development mode, additional debug endpoints are available:

- `GET /api/auth/debug/token` - Inspect current token details
- Enhanced error messages with stack traces
- Relaxed rate limiting for testing

