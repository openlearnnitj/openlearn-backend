# OpenLearn League Assignment System - Complete Documentation

## Overview

The OpenLearn League Assignment System provides a hierarchical permission-based access control for pathfinders. The GRAND_PATHFINDER has god-mode access and can:

1. Create leagues
2. Promote users to PATHFINDER role  
3. Assign/revoke league access to pathfinders
4. Control granular permissions (canManageUsers, canViewAnalytics, canCreateContent)
5. Monitor all assignments across the system

## System Architecture

### Role Hierarchy
```
GRAND_PATHFINDER (God Mode)
├── Can access all content and functionality
├── Can promote users to any role
├── Can create/manage leagues
├── Can assign/revoke league access
└── Can modify pathfinder permissions

PATHFINDER (League-based Access)
├── Access limited to assigned leagues
├── Permissions controlled per league assignment
└── Cannot access content outside assigned leagues

PIONEER (Standard User)
├── Basic content access
└── No administrative capabilities
```

### Permission System

Each pathfinder's league assignment includes three granular permissions:

- **canManageUsers**: Can manage users within assigned leagues
- **canViewAnalytics**: Can view analytics for assigned leagues  
- **canCreateContent**: Can create/edit content in assigned leagues

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password

### League Management (GRAND_PATHFINDER only)
- `POST /api/leagues` - Create new league
- `GET /api/leagues` - List all leagues
- `PUT /api/leagues/:id` - Update league
- `DELETE /api/leagues/:id` - Delete league

### League Assignment Management (GRAND_PATHFINDER only)
- `POST /api/admin/assign-leagues` - Assign leagues to pathfinder
- `GET /api/admin/pathfinder-leagues/:pathfinderId` - Get pathfinder's league assignments
- `DELETE /api/admin/pathfinder-leagues/:pathfinderId/:leagueId` - Remove league assignment
- `GET /api/admin/pathfinder-assignments` - Get all pathfinder assignments
- `PUT /api/admin/pathfinder-leagues/:pathfinderId/:leagueId/permissions` - Update permissions

### User Management (GRAND_PATHFINDER only)  
- `PUT /api/admin/users/:userId/role` - Promote user to PATHFINDER

## API Request/Response Examples

### 1. Create League
```bash
POST /api/leagues
Authorization: Bearer <GRAND_PATHFINDER_TOKEN>
Content-Type: application/json

{
  "name": "AI/ML League",
  "description": "Artificial Intelligence and Machine Learning content"
}

Response:
{
  "success": true,
  "data": {
    "id": "league_id_123",
    "name": "AI/ML League", 
    "description": "Artificial Intelligence and Machine Learning content",
    "createdAt": "2025-08-23T19:53:31.896Z",
    "updatedAt": "2025-08-23T19:53:31.896Z"
  },
  "message": "League created successfully"
}
```

### 2. Assign League to Pathfinder
```bash
POST /api/admin/assign-leagues
Authorization: Bearer <GRAND_PATHFINDER_TOKEN>
Content-Type: application/json

{
  "pathfinderId": "user_id_456",
  "leagueIds": ["league_id_123"],
  "permissions": {
    "canManageUsers": true,
    "canViewAnalytics": true,
    "canCreateContent": true
  }
}

Response:
{
  "success": true,
  "message": "Successfully assigned 1 leagues to Test Pathfinder",
  "data": {
    "pathfinder": {
      "id": "user_id_456",
      "email": "pathfinder@example.com",
      "name": "Test Pathfinder",
      "role": "PATHFINDER"
    },
    "assignedLeagues": [
      {
        "id": "league_id_123",
        "name": "AI/ML League"
      }
    ],
    "scopesCreated": 1,
    "permissions": {
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canCreateContent": true
    }
  }
}
```

### 3. Update Pathfinder Permissions
```bash
PUT /api/admin/pathfinder-leagues/user_id_456/league_id_123/permissions
Authorization: Bearer <GRAND_PATHFINDER_TOKEN>
Content-Type: application/json

{
  "permissions": {
    "canManageUsers": true,
    "canViewAnalytics": true,
    "canCreateContent": true
  }
}

Response:
{
  "success": true,
  "data": {
    "pathfinder": {
      "id": "user_id_456",
      "name": "Test Pathfinder",
      "email": "pathfinder@example.com"
    },
    "league": {
      "id": "league_id_123",
      "name": "AI/ML League"
    },
    "permissions": {
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canCreateContent": true
    },
    "updatedAt": "2025-08-23T20:00:00.000Z",
    "updatedBy": {
      "id": "grand_pathfinder_id",
      "email": "grand.pathfinder@openlearn.org.in"
    }
  },
  "message": "Permissions updated successfully for Test Pathfinder in league AI/ML League"
}
```

### 4. Get Pathfinder's League Assignments
```bash
GET /api/admin/pathfinder-leagues/user_id_456
Authorization: Bearer <GRAND_PATHFINDER_TOKEN>

Response:
{
  "success": true,
  "data": {
    "pathfinder": {
      "id": "user_id_456",
      "email": "pathfinder@example.com",
      "name": "Test Pathfinder",
      "role": "PATHFINDER"
    },
    "leagues": [
      {
        "leagueId": "league_id_123",
        "league": {
          "id": "league_id_123",
          "name": "AI/ML League",
          "description": "Artificial Intelligence and Machine Learning content",
          "createdAt": "2025-08-23T19:53:31.896Z",
          "updatedAt": "2025-08-23T19:53:31.896Z"
        },
        "permissions": {
          "canManageUsers": true,
          "canViewAnalytics": true,
          "canCreateContent": true
        },
        "assignedAt": "2025-08-23T19:53:31.941Z",
        "assignedBy": {
          "id": "grand_pathfinder_id",
          "name": "Grand Pathfinder Admin",
          "email": "grand.pathfinder@openlearn.org.in"
        }
      }
    ],
    "totalLeagues": 1
  },
  "message": "Retrieved 1 league assignments for Test Pathfinder"
}
```

## Default Credentials

### GRAND_PATHFINDER
- **Email**: `grand.pathfinder@openlearn.org.in`
- **Password**: `GrandPath123!`

### Test Users
- **Admin**: `admin@openlearn.org.in` / `admin123!`
- **Developer**: `developer@openlearn.org.in` / `dev123!`
- **Pioneer**: `test.pioneer@openlearn.org.in` / `pioneer123!`

## Authorization Flow

1. **GRAND_PATHFINDER logs in** and receives JWT token
2. **Creates leagues** for organizing content
3. **Promotes users** to PATHFINDER role if needed
4. **Assigns league access** to pathfinders with specific permissions
5. **Pathfinders can access** only their assigned leagues
6. **GRAND_PATHFINDER can modify** permissions anytime
7. **GRAND_PATHFINDER can revoke** league access anytime

## Security Features

- **JWT-based authentication** with refresh tokens
- **Role-based authorization** with hierarchy enforcement
- **League-scoped access control** prevents unauthorized access
- **Granular permissions** for fine-tuned control
- **Audit logging** for all assignment changes
- **God-mode for GRAND_PATHFINDER** bypasses all restrictions

## Testing

Use the provided test scripts:
- `scripts/test-league-assignment-flow.sh` - Complete flow test
- `scripts/debug-grand-pathfinder.sh` - Debug authentication
- `scripts/test-enhanced-authorization.sh` - Authorization testing

## Database Schema

### Key Models
- **User**: Stores user information and role
- **League**: Content organization units
- **PathfinderScope**: Junction table for pathfinder-league assignments with permissions
- **AuditLog**: Tracks all system changes

### Relations
- User (1) -> (N) PathfinderScope (Pathfinder assignments)
- League (1) -> (N) PathfinderScope (League assignments)
- User (1) -> (N) AuditLog (Activity tracking)

## Migration Notes

This system replaces the old cohort/specialization-based PathfinderScope system with a simplified league-based approach:

- **Removed**: cohortId, specializationId from PathfinderScope
- **Added**: leagueId (required) to PathfinderScope  
- **Enhanced**: Permission management and role hierarchy
- **Improved**: Authorization middleware for better access control
