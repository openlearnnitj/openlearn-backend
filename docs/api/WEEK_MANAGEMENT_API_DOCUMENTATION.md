# Week Management API Documentation

## Overview
Week Management API provides CRUD operations for weeks within leagues. Weeks represent weekly learning modules that contain sections with educational resources.

## Base URL
```
http://localhost:3000/api/weeks
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Role-Based Access Control
- **CREATE/UPDATE/DELETE**: Chief Pathfinder+ only
- **READ**: All authenticated users
- **ADMIN VIEW**: Pathfinder+ only

---

## Week Endpoints

### 1. Create Week
Create a new week in a league.

**Endpoint:** `POST /api/weeks`  
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
  "name": "Week 1: Introduction to Machine Learning",
  "description": "Foundations of ML, basic concepts, and getting started",
  "order": 1,
  "leagueId": "league_id"
}
```

**Required Fields:**
- `name`: Week title
- `order`: Week sequence number (positive integer)
- `leagueId`: ID of the parent league

**Optional Fields:**
- `description`: Week description

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "week_id",
    "name": "Week 1: Introduction to Machine Learning",
    "description": "Foundations of ML, basic concepts, and getting started",
    "order": 1,
    "leagueId": "league_id",
    "createdAt": "2025-06-09T22:41:38.950Z",
    "updatedAt": "2025-06-09T22:41:38.950Z",
    "league": {
      "id": "league_id",
      "name": "AI/ML League"
    },
    "sections": [],
    "_count": {
      "sections": 0
    }
  },
  "message": "Week created successfully"
}
```

**Validation Rules:**
- Week order must be unique within each league
- Order must be a positive integer
- League must exist
- Name is required and will be trimmed

### 2. Get Weeks by League
Retrieve all weeks for a specific league.

**Endpoint:** `GET /api/weeks/league/:leagueId`  
**Access:** All authenticated users  

**Parameters:**
- `leagueId` (path): League ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "league": {
      "id": "league_id",
      "name": "AI/ML League"
    },
    "weeks": [
      {
        "id": "week_id",
        "name": "Week 1: Introduction to Machine Learning",
        "description": "Foundations of ML, basic concepts, and getting started",
        "order": 1,
        "leagueId": "league_id",
        "createdAt": "2025-06-09T22:41:38.950Z",
        "updatedAt": "2025-06-09T22:41:38.950Z",
        "sections": [],
        "_count": {
          "sections": 0
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
  "message": "Weeks retrieved successfully"
}
```

### 3. Get Week by ID
Retrieve a specific week with full details including sections.

**Endpoint:** `GET /api/weeks/:id`  
**Access:** All authenticated users  

**Parameters:**
- `id` (path): Week ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "week_id",
    "name": "Week 1: Introduction to Machine Learning",
    "description": "Foundations of ML, basic concepts, and getting started",
    "order": 1,
    "leagueId": "league_id",
    "createdAt": "2025-06-09T22:41:38.950Z",
    "updatedAt": "2025-06-09T22:41:38.950Z",
    "league": {
      "id": "league_id",
      "name": "AI/ML League",
      "description": "Artificial Intelligence and Machine Learning fundamentals"
    },
    "sections": [
      {
        "id": "section_id",
        "name": "Introduction to ML Concepts",
        "order": 1,
        "resources": [
          {
            "id": "resource_id",
            "title": "What is Machine Learning?",
            "url": "https://example.com/ml-intro",
            "type": "BLOG",
            "order": 1
          }
        ],
        "_count": {
          "resources": 1
        }
      }
    ],
    "_count": {
      "sections": 1
    }
  },
  "message": "Week retrieved successfully"
}
```

### 4. Update Week
Update week information.

**Endpoint:** `PUT /api/weeks/:id`  
**Access:** Chief Pathfinder+  

**Parameters:**
- `id` (path): Week ID

**Request Body:**
```json
{
  "name": "Week 1: Introduction to ML & Python Basics",
  "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
  "order": 1
}
```

**All fields are optional:**
- `name`: New week title
- `description`: New description (can be null)
- `order`: New order (must be unique in league)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "week_id",
    "name": "Week 1: Introduction to ML & Python Basics",
    "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
    "order": 1,
    "leagueId": "league_id",
    "createdAt": "2025-06-09T22:41:38.950Z",
    "updatedAt": "2025-06-09T22:44:53.992Z",
    "league": {
      "id": "league_id",
      "name": "AI/ML League"
    },
    "sections": [],
    "_count": {
      "sections": 0
    }
  },
  "message": "Week updated successfully"
}
```

### 5. Delete Week
Delete a week (only if no sections exist).

**Endpoint:** `DELETE /api/weeks/:id`  
**Access:** Grand Pathfinder only  

**Parameters:**
- `id` (path): Week ID

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedWeek": {
      "id": "week_id",
      "name": "Week 1: Introduction to Machine Learning",
      "order": 1
    }
  },
  "message": "Week deleted successfully"
}
```

**Constraints:**
- Cannot delete week with existing sections
- Only Grand Pathfinder can delete weeks

### 6. Get All Weeks (Admin)
Admin-only endpoint to view all weeks across leagues with filtering.

**Endpoint:** `GET /api/weeks`  
**Access:** Pathfinder+  

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `leagueId` (optional): Filter by specific league

**Response:**
```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "id": "week_id",
        "name": "Week 1: Introduction to Machine Learning",
        "description": "Foundations of ML, basic concepts, and getting started",
        "order": 1,
        "leagueId": "league_id",
        "createdAt": "2025-06-09T22:41:38.950Z",
        "updatedAt": "2025-06-09T22:41:38.950Z",
        "league": {
          "id": "league_id",
          "name": "AI/ML League"
        },
        "_count": {
          "sections": 0
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
  "message": "Weeks retrieved successfully"
}
```

---

## 🔨 Testing Examples

### Create Week Workflow
```bash
# 1. Login as admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@openlearn.com", "password": "SecurePass123!"}' \
  | jq -r '.data.accessToken')

# 2. Create first week
curl -X POST http://localhost:3000/api/weeks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Week 1: Introduction to Machine Learning",
    "description": "Foundations of ML, basic concepts, and getting started",
    "order": 1,
    "leagueId": "your_league_id"
  }'

# 3. Create second week
curl -X POST http://localhost:3000/api/weeks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Week 2: Data Preprocessing",
    "description": "Learning to clean and prepare data for ML algorithms",
    "order": 2,
    "leagueId": "your_league_id"
  }'

# 4. Get all weeks for league
curl -X GET "http://localhost:3000/api/weeks/league/your_league_id" \
  -H "Authorization: Bearer $TOKEN"

# 5. Update a week
curl -X PUT "http://localhost:3000/api/weeks/week_id" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Week 1: ML Fundamentals & Python Setup",
    "description": "Updated description with more details"
  }'
```

### Test Validation
```bash
# Test duplicate order (should fail)
curl -X POST http://localhost:3000/api/weeks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Duplicate Week",
    "description": "This should fail",
    "order": 1,
    "leagueId": "your_league_id"
  }'
# Expected: {"success":false,"error":"Week with order 1 already exists in this league"}

# Test invalid order (should fail)
curl -X POST http://localhost:3000/api/weeks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Invalid Week",
    "order": -1,
    "leagueId": "your_league_id"
  }'
# Expected: {"success":false,"error":"Order must be a positive integer"}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Week with order 1 already exists in this league"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "League not found"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**422 Validation Error:**
```json
{
  "success": false,
  "error": "name is required, order is required, leagueId is required"
}
```

---

## Business Rules

1. **Week Ordering**: Each week must have a unique order within its league
2. **Sequential Ordering**: Recommended to use sequential numbers (1, 2, 3...)
3. **Deletion Protection**: Cannot delete weeks that have sections
4. **League Relationship**: Weeks belong to exactly one league
5. **Role Restrictions**: Only Chief Pathfinder+ can manage weeks
6. **Audit Logging**: All week operations are logged for tracking

---

## 🔄 Next Steps

With Week Management complete, the next logical step is implementing **Section Management**:

1. **Sections**: Individual learning units within weeks
2. **Resources**: Learning materials (blogs, videos, links) within sections
3. **Progress Tracking**: Track section completion for students

This will complete the content structure: `Cohort → Specialization → League → Week → Section → Resources`

---

*Last updated: June 10, 2025*
