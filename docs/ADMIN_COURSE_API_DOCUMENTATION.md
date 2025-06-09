# OpenLearn Admin & Course Management API Documentation

## Overview
This document covers the admin and course management endpoints for the OpenLearn platform. These endpoints handle user management, cohort creation, league management, and specialization setup.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Role-Based Access Control (RBAC)
- **GRAND_PATHFINDER**: Full system access
- **CHIEF_PATHFINDER**: Can manage courses, cohorts, and approve users
- **PATHFINDER**: Limited admin access
- **PIONEER**: Students (default role)
- **LUMINARY**: High-performing students

---

## Admin Endpoints

### 1. Get Pending Users
Get all users pending approval.

**Endpoint:** `GET /api/admin/pending-users`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "john@example.com",
        "name": "John Doe",
        "role": "PIONEER",
        "status": "PENDING",
        "twitterHandle": "@johndoe",
        "linkedinUrl": "https://linkedin.com/in/johndoe",
        "githubUsername": "johndoe",
        "kaggleUsername": "johndoe",
        "createdAt": "2025-06-09T22:30:00.000Z",
        "updatedAt": "2025-06-09T22:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Pending users retrieved successfully"
}
```

### 2. Approve User
Approve a pending user account.

**Endpoint:** `POST /api/admin/approve-user`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "userId": "user_id_to_approve"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "PIONEER",
      "status": "ACTIVE",
      "createdAt": "2025-06-09T22:30:00.000Z",
      "updatedAt": "2025-06-09T22:30:15.000Z"
    }
  },
  "message": "User approved successfully"
}
```

### 3. Update User Role
Change a user's role in the system.

**Endpoint:** `PUT /api/admin/update-role`  
**Access:** Grand Pathfinder only  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "userId": "user_id",
  "newRole": "PATHFINDER"
}
```

**Valid Roles:**
- `GRAND_PATHFINDER`
- `CHIEF_PATHFINDER`
- `PATHFINDER`
- `PIONEER`
- `LUMINARY`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "PATHFINDER",
      "status": "ACTIVE",
      "updatedAt": "2025-06-09T22:35:00.000Z"
    }
  },
  "message": "User role updated successfully"
}
```

### 4. Update User Status
Change a user's account status.

**Endpoint:** `PUT /api/admin/update-status`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "userId": "user_id",
  "newStatus": "SUSPENDED"
}
```

**Valid Statuses:**
- `PENDING`
- `ACTIVE`
- `SUSPENDED`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "PIONEER",
      "status": "SUSPENDED",
      "updatedAt": "2025-06-09T22:40:00.000Z"
    }
  },
  "message": "User status updated successfully"
}
```

---

## Cohort Management

### 1. Create Cohort
Create a new cohort for students.

**Endpoint:** `POST /api/cohorts`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "name": "Cohort 1",
  "description": "First cohort of OpenLearn pioneers",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cohort_id",
    "name": "Cohort 1",
    "description": "First cohort of OpenLearn pioneers",
    "isActive": true,
    "createdAt": "2025-06-09T22:21:02.811Z",
    "updatedAt": "2025-06-09T22:21:02.811Z"
  },
  "message": "Cohort created successfully"
}
```

### 2. Get All Cohorts
Retrieve all cohorts with pagination.

**Endpoint:** `GET /api/cohorts`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `isActive` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "cohorts": [
      {
        "id": "cohort_id",
        "name": "Cohort 1",
        "description": "First cohort of OpenLearn pioneers",
        "isActive": true,
        "createdAt": "2025-06-09T22:21:02.811Z",
        "updatedAt": "2025-06-09T22:21:02.811Z",
        "specializations": [
          {
            "id": "spec_id",
            "name": "FinTech Specialization"
          }
        ],
        "enrollments": [],
        "_count": {
          "enrollments": 0,
          "specializations": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Cohorts retrieved successfully"
}
```

### 3. Get Cohort by ID
Retrieve a specific cohort with full details.

**Endpoint:** `GET /api/cohorts/:id`  
**Access:** All authenticated users  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cohort_id",
    "name": "Cohort 1",
    "description": "First cohort of OpenLearn pioneers",
    "isActive": true,
    "createdAt": "2025-06-09T22:21:02.811Z",
    "updatedAt": "2025-06-09T22:21:02.811Z",
    "specializations": [
      {
        "id": "spec_id",
        "name": "FinTech Specialization",
        "description": "Complete specialization combining AI/ML and Finance",
        "leagues": [
          {
            "id": 1,
            "order": 1,
            "league": {
              "id": "league_id",
              "name": "AI/ML League"
            }
          }
        ]
      }
    ],
    "enrollments": [],
    "_count": {
      "enrollments": 0,
      "specializations": 1
    }
  },
  "message": "Cohort retrieved successfully"
}
```

### 4. Update Cohort
Update cohort information.

**Endpoint:** `PUT /api/cohorts/:id`  
**Access:** Chief Pathfinder+  

**Request Body:**
```json
{
  "name": "Updated Cohort Name",
  "description": "Updated description",
  "isActive": false
}
```

### 5. Delete Cohort
Delete a cohort (only if no enrollments exist).

**Endpoint:** `DELETE /api/cohorts/:id`  
**Access:** Grand Pathfinder only  

---

## 📚 League Management

### 1. Create League
Create a new learning league (course).

**Endpoint:** `POST /api/leagues`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "name": "AI/ML League",
  "description": "Artificial Intelligence and Machine Learning fundamentals",
  "cohortId": "cohort_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "league_id",
    "name": "AI/ML League",
    "description": "Artificial Intelligence and Machine Learning fundamentals",
    "createdAt": "2025-06-09T22:22:51.016Z",
    "updatedAt": "2025-06-09T22:22:51.016Z",
    "_count": {
      "weeks": 0,
      "enrollments": 0,
      "badges": 0
    }
  },
  "message": "League created successfully"
}
```

### 2. Get All Leagues
Retrieve all leagues with pagination.

**Endpoint:** `GET /api/leagues`  
**Access:** All authenticated users  

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `cohortId` (optional): Filter by cohort

**Response:**
```json
{
  "success": true,
  "data": {
    "leagues": [
      {
        "id": "league_id",
        "name": "AI/ML League",
        "description": "Artificial Intelligence and Machine Learning fundamentals",
        "createdAt": "2025-06-09T22:22:51.016Z",
        "updatedAt": "2025-06-09T22:22:51.016Z",
        "weeks": [],
        "badges": [],
        "assignment": null,
        "_count": {
          "weeks": 0,
          "enrollments": 0,
          "badges": 0,
          "specializations": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  },
  "message": "Leagues retrieved successfully"
}
```

### 3. Get League by ID
Retrieve a specific league with full details.

**Endpoint:** `GET /api/leagues/:id`  
**Access:** All authenticated users  

### 4. Update League
Update league information.

**Endpoint:** `PUT /api/leagues/:id`  
**Access:** Chief Pathfinder+  

### 5. Delete League
Delete a league (only if no enrollments exist).

**Endpoint:** `DELETE /api/leagues/:id`  
**Access:** Grand Pathfinder only  

---

## 🎯 Specialization Management

### 1. Create Specialization
Create a new specialization that combines multiple leagues.

**Endpoint:** `POST /api/specializations`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "name": "FinTech Specialization",
  "description": "Complete specialization combining AI/ML and Finance for FinTech mastery",
  "cohortId": "cohort_id",
  "leagues": [
    {
      "leagueId": "ai_ml_league_id",
      "order": 1
    },
    {
      "leagueId": "finance_league_id",
      "order": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "specialization_id",
    "name": "FinTech Specialization",
    "description": "Complete specialization combining AI/ML and Finance for FinTech mastery",
    "cohortId": "cohort_id",
    "createdAt": "2025-06-09T22:25:52.140Z",
    "updatedAt": "2025-06-09T22:25:52.140Z",
    "cohort": {
      "id": "cohort_id",
      "name": "Cohort 1"
    },
    "leagues": [
      {
        "id": 1,
        "specializationId": "specialization_id",
        "leagueId": "ai_ml_league_id",
        "order": 1,
        "league": {
          "id": "ai_ml_league_id",
          "name": "AI/ML League",
          "description": "Artificial Intelligence and Machine Learning fundamentals"
        }
      },
      {
        "id": 2,
        "specializationId": "specialization_id",
        "leagueId": "finance_league_id",
        "order": 2,
        "league": {
          "id": "finance_league_id",
          "name": "Finance League",
          "description": "Financial markets, trading, and investment fundamentals"
        }
      }
    ]
  },
  "message": "Specialization created successfully"
}
```

### 2. Get All Specializations
Retrieve all specializations with pagination.

**Endpoint:** `GET /api/specializations`  
**Access:** All authenticated users  

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `cohortId` (optional): Filter by cohort

**Response:**
```json
{
  "success": true,
  "data": {
    "specializations": [
      {
        "id": "specialization_id",
        "name": "FinTech Specialization",
        "description": "Complete specialization combining AI/ML and Finance for FinTech mastery",
        "cohortId": "cohort_id",
        "createdAt": "2025-06-09T22:25:52.140Z",
        "updatedAt": "2025-06-09T22:25:52.140Z",
        "cohort": {
          "id": "cohort_id",
          "name": "Cohort 1"
        },
        "leagues": [
          {
            "id": 1,
            "order": 1,
            "league": {
              "id": "ai_ml_league_id",
              "name": "AI/ML League"
            }
          },
          {
            "id": 2,
            "order": 2,
            "league": {
              "id": "finance_league_id",
              "name": "Finance League"
            }
          }
        ],
        "_count": {
          "userSpecializations": 0,
          "leagues": 2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Specializations retrieved successfully"
}
```

### 3. Get Specialization by ID
Retrieve a specific specialization with full details.

**Endpoint:** `GET /api/specializations/:id`  
**Access:** All authenticated users  

### 4. Update Specialization
Update specialization information.

**Endpoint:** `PUT /api/specializations/:id`  
**Access:** Chief Pathfinder+  

### 5. Delete Specialization
Delete a specialization.

**Endpoint:** `DELETE /api/specializations/:id`  
**Access:** Grand Pathfinder only  

---

## 📊 Common Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Field1 is required, Field2 must be valid"
}
```

### Authentication Error Response
```json
{
  "success": false,
  "error": "Access token is required"
}
```

### Authorization Error Response
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

---

## 🔍 Testing Examples

### Test Admin Workflow
```bash
# 1. Login as Grand Pathfinder
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@openlearn.com",
    "password": "SecurePass123!"
  }'

# 2. Create a cohort
curl -X POST http://localhost:3000/api/cohorts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Cohort 2.0",
    "description": "Second cohort with improved curriculum",
    "isActive": true
  }'

# 3. Create leagues
curl -X POST http://localhost:3000/api/leagues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Data Science League",
    "description": "Comprehensive data science and analytics",
    "cohortId": "cohort_id"
  }'

# 4. Create specialization
curl -X POST http://localhost:3000/api/specializations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Full Stack Data Scientist",
    "description": "Complete data science specialization",
    "cohortId": "cohort_id",
    "leagues": [
      {
        "leagueId": "data_science_league_id",
        "order": 1
      }
    ]
  }'
```

### Test User Management
```bash
# 1. Get pending users
curl -X GET http://localhost:3000/api/admin/pending-users \
  -H "Authorization: Bearer <access_token>"

# 2. Approve a user
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "userId": "user_id_to_approve"
  }'

# 3. Update user role
curl -X PUT http://localhost:3000/api/admin/update-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "userId": "user_id",
    "newRole": "PATHFINDER"
  }'
```

