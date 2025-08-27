# OpenLearn Backend V2 - Complete API Documentation

## Table of Contents
1. [Email Verification API](#email-verification-api)
2. [PathfinderScope Management API](#pathfinderscope-management-api)
3. [Updated User Profile API](#updated-user-profile-api)
4. [Updated Authorization Routes](#updated-authorization-routes)
5. [Migration Examples](#migration-examples)
6. [Migration API](#migration-api)

---

## 📧 Email Verification API

### Base URL: `/api/auth`

### 1. Send Verification OTP
**POST** `/api/auth/send-verification-otp`

**Description**: Send email verification OTP to authenticated user's email

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**: Empty `{}`

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Verification OTP sent successfully",
  "email": "us***@example.com"
}
```

**Response (Already Verified - 400)**:
```json
{
  "error": "Email is already verified"
}
```

**Response (Rate Limited - 429)**:
```json
{
  "error": "OTP recently sent. Please wait before requesting another.",
  "retryAfter": 60
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/auth/send-verification-otp \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 2. Verify Email OTP
**POST** `/api/auth/verify-email-otp`

**Description**: Verify email using the OTP sent to user's email

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "otp": "123456"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "emailVerified": true
}
```

**Response (Invalid OTP - 400)**:
```json
{
  "error": "Invalid or expired OTP",
  "details": "OTP has expired"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/auth/verify-email-otp \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"otp": "123456"}'
```

---

### 3. Get Verification Status
**GET** `/api/auth/verification-status`

**Description**: Get current user's email verification status

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response (200)**:
```json
{
  "email": "us***@example.com",
  "emailVerified": false,
  "pendingOTP": true,
  "otpExpiresAt": "2025-08-17T10:30:00.000Z",
  "lastOTPSent": "2025-08-17T10:15:00.000Z"
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3000/api/auth/verification-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Resend Verification OTP
**POST** `/api/auth/resend-verification-otp`

**Description**: Resend verification OTP with enhanced rate limiting

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**: Empty `{}`

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Verification OTP resent successfully",
  "email": "us***@example.com",
  "remainingAttempts": 4
}
```

**Response (Rate Limited - 429)**:
```json
{
  "error": "Please wait before requesting another OTP",
  "retryAfter": 120
}
```

**Response (Daily Limit - 429)**:
```json
{
  "error": "Daily OTP limit reached. Please try again tomorrow.",
  "dailyLimit": 5
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/auth/resend-verification-otp \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 5. Admin: Get User Verification Status
**GET** `/api/auth/verification-status/:userId`

**Description**: Admin endpoint to check any user's verification status

**Authentication**: Required (Admin Bearer Token)

**Request Headers**:
```
Authorization: Bearer <admin-jwt-token>
```

**URL Parameters**:
- `userId` (string): Target user's ID

**Response (200)**:
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "emailVerified": false,
  "pendingOTP": true,
  "otpExpiresAt": "2025-08-17T10:30:00.000Z",
  "lastOTPSent": "2025-08-17T10:15:00.000Z",
  "userCreatedAt": "2025-08-01T08:00:00.000Z",
  "lastUpdated": "2025-08-17T10:15:00.000Z"
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3000/api/auth/verification-status/user123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Admin: Manually Verify Email
**POST** `/api/auth/admin-verify-email/:userId`

**Description**: Admin endpoint to manually verify a user's email

**Authentication**: Required (Admin Bearer Token)

**Request Headers**:
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**URL Parameters**:
- `userId` (string): Target user's ID

**Request Body**:
```json
{
  "reason": "Manual verification due to email delivery issues"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Email verified successfully by admin",
  "userId": "user123",
  "email": "user@example.com",
  "emailVerified": true
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/auth/admin-verify-email/user123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"reason": "Manual verification due to email delivery issues"}'
```

---

## 🎯 PathfinderScope Management API

### Base URL: `/api/pathfinder-scopes`

### 1. Get All Scopes
**GET** `/api/pathfinder-scopes`

**Description**: Get all pathfinder scopes with filtering options

**Authentication**: Required (Pathfinder Bearer Token)

**Query Parameters**:
- `cohortId` (optional): Filter by cohort
- `specializationId` (optional): Filter by specialization
- `pathfinderId` (optional): Filter by pathfinder
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200)**:
```json
{
  "scopes": [
    {
      "id": "scope123",
      "pathfinderId": "user123",
      "cohortId": "cohort456",
      "specializationId": null,
      "leagueId": "league789",
      "canCreateContent": true,
      "canManageUsers": false,
      "canViewAnalytics": true,
      "createdAt": "2025-08-17T10:00:00.000Z",
      "pathfinder": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "cohort": {
        "id": "cohort456",
        "name": "Fall 2025 Cohort"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**cURL Example**:
```bash
curl -X GET "http://localhost:3000/api/pathfinder-scopes?cohortId=cohort456&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get My Scopes
**GET** `/api/pathfinder-scopes/my-scopes`

**Description**: Get current pathfinder's scopes

**Authentication**: Required (Pathfinder Bearer Token)

**Response (200)**:
```json
{
  "scopes": [
    {
      "id": "scope123",
      "cohortId": "cohort456",
      "specializationId": null,
      "leagueId": "league789",
      "canCreateContent": true,
      "canManageUsers": false,
      "canViewAnalytics": true,
      "cohort": {
        "id": "cohort456",
        "name": "Fall 2025 Cohort"
      },
      "league": {
        "id": "league789",
        "name": "AI/ML League"
      }
    }
  ]
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3000/api/pathfinder-scopes/my-scopes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Create Scope
**POST** `/api/pathfinder-scopes`

**Description**: Create a new pathfinder scope

**Authentication**: Required (Pathfinder Bearer Token with canManageUsers permission)

**Request Body**:
```json
{
  "pathfinderId": "user123",
  "cohortId": "cohort456",
  "specializationId": null,
  "leagueId": "league789",
  "canCreateContent": true,
  "canManageUsers": false,
  "canViewAnalytics": true
}
```

**Response (Success - 201)**:
```json
{
  "success": true,
  "scope": {
    "id": "scope789",
    "pathfinderId": "user123",
    "cohortId": "cohort456",
    "specializationId": null,
    "leagueId": "league789",
    "canCreateContent": true,
    "canManageUsers": false,
    "canViewAnalytics": true,
    "assignedById": "admin123",
    "createdAt": "2025-08-17T10:30:00.000Z"
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/pathfinder-scopes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "pathfinderId": "user123",
    "cohortId": "cohort456",
    "leagueId": "league789",
    "canCreateContent": true,
    "canManageUsers": false,
    "canViewAnalytics": true
  }'
```

---

### 4. Update Scope
**PUT** `/api/pathfinder-scopes/:id`

**Description**: Update an existing pathfinder scope

**Authentication**: Required (Pathfinder Bearer Token with canManageUsers permission)

**URL Parameters**:
- `id` (string): Scope ID to update

**Request Body**:
```json
{
  "canCreateContent": false,
  "canManageUsers": true,
  "canViewAnalytics": true
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "scope": {
    "id": "scope123",
    "pathfinderId": "user123",
    "cohortId": "cohort456",
    "canCreateContent": false,
    "canManageUsers": true,
    "canViewAnalytics": true,
    "updatedAt": "2025-08-17T10:45:00.000Z"
  }
}
```

**cURL Example**:
```bash
curl -X PUT http://localhost:3000/api/pathfinder-scopes/scope123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "canCreateContent": false,
    "canManageUsers": true,
    "canViewAnalytics": true
  }'
```

---

### 5. Delete Scope
**DELETE** `/api/pathfinder-scopes/:id`

**Description**: Delete a pathfinder scope

**Authentication**: Required (Pathfinder Bearer Token with canManageUsers permission)

**URL Parameters**:
- `id` (string): Scope ID to delete

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "PathfinderScope deleted successfully"
}
```

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/api/pathfinder-scopes/scope123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Bulk Assign Scopes
**POST** `/api/pathfinder-scopes/bulk-assign`

**Description**: Assign scopes to multiple pathfinders at once

**Authentication**: Required (Pathfinder Bearer Token with canManageUsers permission)

**Request Body**:
```json
{
  "pathfinderIds": ["user123", "user456", "user789"],
  "scopeTemplate": {
    "cohortId": "cohort456",
    "leagueId": "league789",
    "canCreateContent": true,
    "canManageUsers": false,
    "canViewAnalytics": true
  }
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "created": 3,
  "scopes": [
    {
      "id": "scope001",
      "pathfinderId": "user123",
      "cohortId": "cohort456"
    },
    {
      "id": "scope002", 
      "pathfinderId": "user456",
      "cohortId": "cohort456"
    },
    {
      "id": "scope003",
      "pathfinderId": "user789", 
      "cohortId": "cohort456"
    }
  ]
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/pathfinder-scopes/bulk-assign \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "pathfinderIds": ["user123", "user456"],
    "scopeTemplate": {
      "cohortId": "cohort456",
      "canCreateContent": true,
      "canViewAnalytics": true
    }
  }'
```

---

### 7. Check Permission
**POST** `/api/pathfinder-scopes/check-permission`

**Description**: Check if current pathfinder has specific permission

**Authentication**: Required (Pathfinder Bearer Token)

**Request Body**:
```json
{
  "permission": "canCreateContent",
  "cohortId": "cohort456"
}
```

**Response (Has Permission - 200)**:
```json
{
  "hasPermission": true,
  "scope": {
    "id": "scope123",
    "cohortId": "cohort456",
    "canCreateContent": true
  }
}
```

**Response (No Permission - 403)**:
```json
{
  "hasPermission": false,
  "error": "Permission canCreateContent not found in any scope"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/pathfinder-scopes/check-permission \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "permission": "canCreateContent",
    "cohortId": "cohort456"
  }'
```

---

## 👤 Updated User Profile API

### Get User Profile (Enhanced)
**GET** `/api/auth/profile`

**Description**: Get current user's profile with enhanced data

**Authentication**: Required (Bearer Token)

**Response (200)**:
```json
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PATHFINDER",
    "status": "ACTIVE",
    "emailVerified": true,
    "createdAt": "2025-08-01T08:00:00.000Z",
    "pathfinderScopes": [
      {
        "id": "scope123",
        "cohort": {
          "id": "cohort456",
          "name": "Fall 2025 Cohort"
        },
        "specialization": null,
        "league": {
          "id": "league789", 
          "name": "AI/ML League"
        },
        "canCreateContent": true,
        "canManageUsers": false,
        "canViewAnalytics": true,
        "assignedBy": {
          "id": "admin123",
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    ],
    "enrollments": [
      {
        "cohort": {
          "id": "cohort456",
          "name": "Fall 2025 Cohort"
        },
        "league": {
          "id": "league789",
          "name": "AI/ML League"
        }
      }
    ],
    "specializations": [
      {
        "specialization": {
          "id": "spec123",
          "name": "Machine Learning"
        }
      }
    ]
  }
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔒 Updated Authorization Routes

### Routes Now Using Scope-Based Authorization

#### Analytics Routes
```bash
# OLD (V1) - Role-based
curl -X GET http://localhost:3000/api/analytics \
  -H "Authorization: Bearer <pathfinder-token>"
# Required: PATHFINDER role

# NEW (V2) - Scope-based  
curl -X GET http://localhost:3000/api/analytics \
  -H "Authorization: Bearer <pathfinder-token>"
# Required: canViewAnalytics permission in any scope
```

#### Assignment Routes
```bash
# Create Assignment (OLD vs NEW)
# OLD: Required CHIEF_PATHFINDER role
# NEW: Required canCreateContent permission

curl -X POST http://localhost:3000/api/assignments \
  -H "Authorization: Bearer <pathfinder-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Assignment",
    "description": "Assignment description",
    "weekId": "week123"
  }'
```

#### Cohort Management Routes
```bash
# Cohort Access (OLD vs NEW)
# OLD: Required PATHFINDER role + manual cohort checks  
# NEW: Required cohort-specific scope

curl -X GET http://localhost:3000/api/cohorts/cohort123 \
  -H "Authorization: Bearer <pathfinder-token>"
# Now automatically checks if user has scope for cohort123
```

#### Specialization Routes
```bash
# Create Specialization (OLD vs NEW)
# OLD: Required CHIEF_PATHFINDER role
# NEW: Required canCreateContent permission

curl -X POST http://localhost:3000/api/specializations \
  -H "Authorization: Bearer <pathfinder-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Science",
    "description": "Data Science Specialization"
  }'
```

---

## 🔄 Migration Examples

### Frontend Migration Example

#### V1 Implementation (Old)
```javascript
// V1 - Check user role
const canCreateContent = user.role === 'CHIEF_PATHFINDER' || user.role === 'GRAND_PATHFINDER';

if (canCreateContent) {
  // Show create content button
}

// V1 - Send email verification via password reset
const verifyEmail = async () => {
  const response = await fetch('/api/auth/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email })
  });
};
```

#### V2 Implementation (New)
```javascript
// V2 - Check specific permissions
const canCreateContent = user.pathfinderScopes?.some(
  scope => scope.canCreateContent
);

if (canCreateContent) {
  // Show create content button
}

// V2 - Dedicated email verification
const verifyEmail = async () => {
  const response = await fetch('/api/auth/send-verification-otp', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({})
  });
};

const confirmVerification = async (otp) => {
  const response = await fetch('/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ otp })
  });
};
```

### Backend Route Migration Example

#### V1 Route (Old)
```javascript
// OLD: Simple role checking
router.post('/content', 
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER, UserRole.GRAND_PATHFINDER),
  createContent
);

router.get('/cohorts/:cohortId',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PATHFINDER),
  // Manual cohort access check in controller
  getCohort
);
```

#### V2 Route (New)
```javascript
// NEW: Permission-based checking
router.post('/content', 
  AuthMiddleware.authenticate,
  PathfinderScopeMiddleware.requirePermission('canCreateContent'),
  createContent
);

router.get('/cohorts/:cohortId',
  AuthMiddleware.authenticate, 
  PathfinderScopeMiddleware.requireCohortAccess('cohortId'),
  getCohort
);
```

---

## 🔄 Migration API

### Base URL: `/api/migration`

### 1. Check Migration Status
**GET** `/api/migration/status`

**Description**: Check if the current user needs migration to V2

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response (Needs Migration - 200)**:
```json
{
  "success": true,
  "data": {
    "needsMigration": true,
    "isOldUser": true,
    "migratedToV2": null,
    "hasOLID": false,
    "emailVerified": false,
    "userSince": "2025-08-17T19:01:05.437Z"
  },
  "message": "User needs migration to V2"
}
```

**Response (Already Migrated - 200)**:
```json
{
  "success": true,
  "data": {
    "needsMigration": false,
    "isOldUser": false,
    "migratedToV2": true,
    "hasOLID": true,
    "emailVerified": true,
    "userSince": "2025-08-17T19:01:05.437Z"
  },
  "message": "User is already on V2 or migrated"
}
```

**cURL Example**:
```bash
curl -X GET "https://api.openlearn.org.in/api/migration/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Migrate to V2
**POST** `/api/migration/migrate-to-v2`

**Description**: Migrate user to V2 with enhanced profile data

**Authentication**: Required (Bearer Token)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "institute": "Indian Institute of Technology, Delhi",
  "department": "Computer Science and Engineering",
  "graduationYear": 2026,
  "phoneNumber": "+91-9876543210",
  "studentId": "2022CS10123",
  "discordUsername": "john_doe#1234",
  "portfolioUrl": "https://github.com/johndoe"
}
```

**Required Fields**:
- `institute` (string): Educational institution name

**Optional Fields**:
- `department` (string): Department/field of study
- `graduationYear` (number): Expected graduation year
- `phoneNumber` (string): Contact phone number
- `studentId` (string): Student/roll number
- `discordUsername` (string): Discord username for community access
- `portfolioUrl` (string): Portfolio/GitHub URL

**Response (Success - 200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmeg1xixo0020lw01d0znhv0e",
      "email": "ckesharwan@gmail.com",
      "name": "Chahat Kesharwani",
      "role": "PIONEER",
      "status": "ACTIVE",
      "institute": "Indian Institute of Technology, Delhi",
      "department": "Computer Science and Engineering",
      "graduationYear": 2026,
      "phoneNumber": "+91-9876543210",
      "studentId": "2022CS10123",
      "discordUsername": "john_doe#1234",
      "portfolioUrl": "https://github.com/johndoe",
      "olid": "OL250001",
      "migratedToV2": true,
      "emailVerified": true,
      "currentCohort": {
        "id": "cohort123",
        "name": "Fall 2025 Cohort"
      }
    },
    "migrationCompleted": true
  },
  "message": "Successfully migrated to V2! Welcome to the enhanced OpenLearn platform."
}
```

**Response (Already Migrated - 400)**:
```json
{
  "success": false,
  "error": "User is already migrated to V2"
}
```

**Response (Missing Required Fields - 400)**:
```json
{
  "success": false,
  "error": "institute is required"
}
```

**Response (OLID Conflict - 409)**:
```json
{
  "success": false,
  "error": "OLID generation conflict. Please try again."
}
```

**cURL Example**:
```bash
curl -X POST "https://api.openlearn.org.in/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "institute": "Indian Institute of Technology, Delhi",
    "department": "Computer Science and Engineering",
    "graduationYear": 2026,
    "phoneNumber": "+91-9876543210",
    "studentId": "2022CS10123",
    "discordUsername": "john_doe#1234",
    "portfolioUrl": "https://github.com/johndoe"
  }'
```
