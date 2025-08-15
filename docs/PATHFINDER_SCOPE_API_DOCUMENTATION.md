# PathfinderScope Management API Documentation

## Overview

The PathfinderScope Management API provides endpoints for managing hierarchical permissions for Pathfinders within the OpenLearn platform. This system allows fine-grained control over what Pathfinders can do within specific cohorts, specializations, and leagues.

## Base URL
```
/api/pathfinder-scopes
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Most endpoints also require the `Pathfinder` role for access.

## Core Concepts

### PathfinderScope Model
A PathfinderScope defines the permissions a Pathfinder has within a specific organizational scope:

- **Scope Levels**: At least one of cohort, specialization, or league must be specified
- **Permissions**: 
  - `canManageUsers`: Can manage users within scope
  - `canViewAnalytics`: Can view analytics within scope  
  - `canCreateContent`: Can create content within scope

### Hierarchical Structure
```
Pathfinder → Scope (Cohort/Specialization/League) → Permissions
```

## API Endpoints

### 1. Get All Pathfinder Scopes

**GET** `/api/pathfinder-scopes`

Get all pathfinder scopes with optional filtering.

**Query Parameters:**
- `pathfinderId` (string, optional): Filter by pathfinder user ID
- `cohortId` (string, optional): Filter by cohort ID
- `specializationId` (string, optional): Filter by specialization ID  
- `leagueId` (string, optional): Filter by league ID
- `canManageUsers` (boolean, optional): Filter by user management permission
- `canViewAnalytics` (boolean, optional): Filter by analytics permission
- `canCreateContent` (boolean, optional): Filter by content creation permission
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "scopes": [
      {
        "id": "scope_123",
        "pathfinderId": "user_456",
        "pathfinder": {
          "id": "user_456",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "PATHFINDER"
        },
        "cohortId": "cohort_789",
        "cohort": {
          "id": "cohort_789",
          "name": "AI Cohort 2024",
          "description": "AI and Machine Learning focused cohort"
        },
        "specializationId": null,
        "specialization": null,
        "leagueId": null,
        "league": null,
        "canManageUsers": true,
        "canViewAnalytics": true,
        "canCreateContent": false,
        "assignedAt": "2024-01-15T10:30:00Z",
        "assignedById": "admin_123",
        "assignedBy": {
          "id": "admin_123",
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 2. Get Current User's Scopes

**GET** `/api/pathfinder-scopes/my-scopes`

Get all scopes assigned to the current authenticated pathfinder.

**Response:**
```json
{
  "success": true,
  "data": {
    "scopes": [
      {
        "id": "scope_123",
        "cohortId": "cohort_789",
        "cohort": {
          "id": "cohort_789", 
          "name": "AI Cohort 2024",
          "description": "AI and Machine Learning focused cohort"
        },
        "canManageUsers": true,
        "canViewAnalytics": true,
        "canCreateContent": false,
        "assignedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 3. Get Specific Scope

**GET** `/api/pathfinder-scopes/:id`

Get details of a specific pathfinder scope.

**Parameters:**
- `id` (string): Scope ID

**Response:**
```json
{
  "success": true,
  "data": {
    "scope": {
      "id": "scope_123",
      "pathfinderId": "user_456",
      "pathfinder": {
        "id": "user_456",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PATHFINDER"
      },
      "cohortId": "cohort_789",
      "cohort": {
        "id": "cohort_789",
        "name": "AI Cohort 2024",
        "description": "AI and Machine Learning focused cohort"
      },
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canCreateContent": false,
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 4. Get User's Scopes

**GET** `/api/pathfinder-scopes/user/:userId`

Get all scopes for a specific pathfinder user.

**Parameters:**
- `userId` (string): Pathfinder user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_456",
      "name": "John Doe", 
      "email": "john@example.com",
      "role": "PATHFINDER"
    },
    "scopes": [
      {
        "id": "scope_123",
        "cohortId": "cohort_789",
        "cohort": {
          "id": "cohort_789",
          "name": "AI Cohort 2024"
        },
        "canManageUsers": true,
        "canViewAnalytics": true,
        "canCreateContent": false
      }
    ]
  }
}
```

### 5. Create New Scope

**POST** `/api/pathfinder-scopes`

Create a new pathfinder scope assignment.

**Request Body:**
```json
{
  "pathfinderId": "user_456",
  "cohortId": "cohort_789",          // At least one of cohortId, 
  "specializationId": null,          // specializationId, or 
  "leagueId": null,                  // leagueId must be provided
  "canManageUsers": true,            // Optional, default: true
  "canViewAnalytics": true,          // Optional, default: true
  "canCreateContent": false          // Optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scope": {
      "id": "scope_123",
      "pathfinderId": "user_456",
      "pathfinder": {
        "id": "user_456",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PATHFINDER"
      },
      "cohortId": "cohort_789",
      "cohort": {
        "id": "cohort_789",
        "name": "AI Cohort 2024"
      },
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canCreateContent": false,
      "assignedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Validation Rules:**
- `pathfinderId` must exist and user must have `PATHFINDER` role
- At least one scope (cohort, specialization, league) must be specified
- Scope entities must exist in database
- No duplicate scope assignments allowed

### 6. Update Scope Permissions

**PUT** `/api/pathfinder-scopes/:id`

Update permissions for an existing scope.

**Parameters:**
- `id` (string): Scope ID

**Request Body:**
```json
{
  "canManageUsers": false,
  "canViewAnalytics": true, 
  "canCreateContent": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scope": {
      "id": "scope_123",
      "canManageUsers": false,
      "canViewAnalytics": true,
      "canCreateContent": true,
      // ... other fields
    }
  }
}
```

### 7. Delete Scope

**DELETE** `/api/pathfinder-scopes/:id`

Remove a pathfinder scope assignment.

**Parameters:**
- `id` (string): Scope ID

**Response:**
```json
{
  "success": true,
  "message": "Pathfinder scope deleted successfully"
}
```

### 8. Bulk Assign Scopes

**POST** `/api/pathfinder-scopes/bulk-assign`

Assign the same scope to multiple pathfinders.

**Request Body:**
```json
{
  "pathfinderIds": ["user_456", "user_789"],
  "cohortId": "cohort_123",
  "specializationId": null,
  "leagueId": null,
  "canManageUsers": true,
  "canViewAnalytics": true,
  "canCreateContent": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": [
      {
        "id": "scope_123",
        "pathfinderId": "user_456",
        "pathfinder": {
          "id": "user_456",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ],
    "errors": [
      {
        "pathfinderId": "user_789",
        "pathfinderName": "Jane Smith",
        "error": "Scope already exists"
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    }
  }
}
```

### 9. Get Users in Scope

**GET** `/api/pathfinder-scopes/scope/:scopeId/users`

Get all users (Pioneers) that fall within a pathfinder's scope.

**Parameters:**
- `scopeId` (string): Pathfinder scope ID

**Response:**
```json
{
  "success": true,
  "data": {
    "scope": {
      "id": "scope_123",
      "cohortId": "cohort_789",
      "cohort": {
        "id": "cohort_789",
        "name": "AI Cohort 2024"
      }
    },
    "users": [
      {
        "id": "user_001",
        "name": "Alice Pioneer",
        "email": "alice@example.com",
        "role": "PIONEER",
        "status": "ACTIVE",
        "createdAt": "2024-01-10T08:00:00Z",
        "enrollments": [
          {
            "cohort": {
              "id": "cohort_789",
              "name": "AI Cohort 2024"
            },
            "league": {
              "id": "league_456",
              "name": "Advanced League"
            }
          }
        ],
        "specializations": [
          {
            "specialization": {
              "id": "spec_123",
              "name": "Machine Learning"
            }
          }
        ]
      }
    ],
    "count": 1
  }
}
```

### 10. Check Permission

**POST** `/api/pathfinder-scopes/check-permission`

Check if a pathfinder has a specific permission within a given scope.

**Request Body:**
```json
{
  "pathfinderId": "user_456",
  "permission": "canManageUsers",    // or "canViewAnalytics", "canCreateContent"
  "cohortId": "cohort_789",          // Optional scope filters
  "specializationId": null,
  "leagueId": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "matchingScopes": 1,
    "permission": "canManageUsers",
    "scopes": [
      {
        "id": "scope_123",
        "cohortId": "cohort_789",
        "canManageUsers": true,
        "canViewAnalytics": true,
        "canCreateContent": false
      }
    ]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "At least one scope (cohort, specialization, or league) must be specified"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Pathfinder scope not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "This scope assignment already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create pathfinder scope"
}
```

## Frontend Integration Examples

### React/JavaScript Usage

#### Get Current User's Scopes
```javascript
const fetchMyScopes = async () => {
  try {
    const response = await fetch('/api/pathfinder-scopes/my-scopes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setScopes(data.data.scopes);
    }
  } catch (error) {
    console.error('Failed to fetch scopes:', error);
  }
};
```

#### Create New Scope Assignment
```javascript
const createScope = async (scopeData) => {
  try {
    const response = await fetch('/api/pathfinder-scopes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scopeData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Scope created:', result.data.scope);
    }
  } catch (error) {
    console.error('Failed to create scope:', error);
  }
};
```

#### Check Permission
```javascript
const checkPermission = async (pathfinderId, permission, scopeFilters = {}) => {
  try {
    const response = await fetch('/api/pathfinder-scopes/check-permission', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pathfinderId,
        permission,
        ...scopeFilters
      })
    });
    
    const result = await response.json();
    return result.success ? result.data.hasPermission : false;
  } catch (error) {
    console.error('Failed to check permission:', error);
    return false;
  }
};
```

## Audit Logging

All PathfinderScope operations are automatically logged with the following audit actions:
- `USER_CREATED` (temporary): Scope creation
- `USER_ROLE_CHANGED` (temporary): Scope updates, deletions, permission checks
- `USER_ENROLLED` (temporary): Bulk assignments

Each audit log includes:
- User ID performing the action
- Action type
- Description of the operation
- Metadata with relevant scope and permission details

## Business Logic Notes

### Scope Hierarchy
- **Cohort**: Groups of students in a specific program/batch
- **Specialization**: Subject area focus (AI, Web Dev, etc.)
- **League**: Skill/performance level grouping

### Permission Types
- **canManageUsers**: Add/remove users, update profiles, manage enrollments
- **canViewAnalytics**: Access progress reports, performance metrics
- **canCreateContent**: Create courses, assignments, resources

### Use Cases
1. **Cohort Pathfinder**: Manages all students in a specific cohort
2. **Subject Matter Expert**: Manages content for a specialization across cohorts
3. **League Coordinator**: Manages users in a specific skill level across all specializations

## Migration Integration

After the `migrate-to-v2` endpoint is called, the PathfinderScope system can be used to:
1. Assign migrated pathfinders to appropriate scopes
2. Set up hierarchical management structure
3. Configure permissions based on organizational roles

The system supports the organizational chart structure with Grand Pathfinders, Chief Pathfinders, and specialized Pathfinders having different scope assignments and permission levels.
