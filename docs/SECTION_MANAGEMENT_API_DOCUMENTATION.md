# OpenLearn Section Management API Documentation

## Overview
This document covers the Section Management endpoints for the OpenLearn platform. Sections are the core learning units within weeks that contain actual educational resources (blogs, videos, articles, external links). They provide the granular structure for organizing learning content in the educational hierarchy.

## Educational Hierarchy
```
Cohort → Specialization → League → Week → Section → Resources
```

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Role-Based Access Control (RBAC)
- **GRAND_PATHFINDER**: Full system access (all operations)
- **CHIEF_PATHFINDER**: Can create, update, and delete sections
- **PATHFINDER**: Can view all sections (admin view)
- **PIONEER**: Can view individual sections and sections by week
- **LUMINARY**: Can view individual sections and sections by week

---

## Section Endpoints

### 1. Create Section
Create a new section within a week.

**Endpoint:** `POST /api/sections`  
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
  "name": "Introduction to Machine Learning",
  "description": "Basic concepts, history, and applications of ML",
  "order": 1,
  "weekId": "cmbpofdza0001g8bi8drfjmq0"
}
```

**Field Descriptions:**
- `name` (string, required): Section name (max 100 characters)
- `description` (string, optional): Detailed description of the section content
- `order` (integer, required): Positive integer for section ordering within the week
- `weekId` (string, required): ID of the parent week

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbppd4sm0004g8gnlm1d7ino",
    "name": "Introduction to Machine Learning",
    "description": "Basic concepts, history, and applications of ML",
    "order": 1,
    "weekId": "cmbpofdza0001g8bi8drfjmq0",
    "createdAt": "2025-06-09T23:07:53.351Z",
    "updatedAt": "2025-06-09T23:07:53.351Z",
    "week": {
      "id": "cmbpofdza0001g8bi8drfjmq0",
      "name": "Week 1: Introduction to ML & Python Basics",
      "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
      "order": 1,
      "leagueId": "cmbpnr7ns0003g802x1t9h6w6",
      "createdAt": "2025-06-09T22:41:38.950Z",
      "updatedAt": "2025-06-09T22:44:53.992Z",
      "league": {
        "id": "cmbpnr7ns0003g802x1t9h6w6",
        "name": "AI/ML League"
      }
    },
    "resources": []
  },
  "message": "Section created successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid order, or name too long
- `404 Not Found`: Week not found
- `409 Conflict`: Section with same order already exists in the week

### 2. Get All Sections (Admin View)
Retrieve all sections with filtering and pagination (admin view).

**Endpoint:** `GET /api/sections`  
**Access:** Pathfinder+  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Query Parameters:**
- `weekId` (optional): Filter sections by specific week
- `leagueId` (optional): Filter sections by league (shows all sections in all weeks of the league)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request:**
```
GET /api/sections?weekId=cmbpofdza0001g8bi8drfjmq0&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "cmbppd4sm0004g8gnlm1d7ino",
        "name": "Introduction to Machine Learning",
        "description": "Basic concepts, history, and applications of ML",
        "order": 1,
        "weekId": "cmbpofdza0001g8bi8drfjmq0",
        "createdAt": "2025-06-09T23:07:53.351Z",
        "updatedAt": "2025-06-09T23:07:53.351Z",
        "week": {
          "id": "cmbpofdza0001g8bi8drfjmq0",
          "name": "Week 1: Introduction to ML & Python Basics",
          "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
          "order": 1,
          "leagueId": "cmbpnr7ns0003g802x1t9h6w6",
          "createdAt": "2025-06-09T22:41:38.950Z",
          "updatedAt": "2025-06-09T22:44:53.992Z",
          "league": {
            "id": "cmbpnr7ns0003g802x1t9h6w6",
            "name": "AI/ML League"
          }
        },
        "resources": [],
        "_count": {
          "resources": 0,
          "progress": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### 3. Get Sections by Week
Retrieve all sections for a specific week (public endpoint).

**Endpoint:** `GET /api/weeks/:id/sections`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Week ID

**Response:**
```json
{
  "success": true,
  "data": {
    "week": {
      "id": "cmbpofdza0001g8bi8drfjmq0",
      "name": "Week 1: Introduction to ML & Python Basics",
      "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
      "order": 1,
      "league": {
        "id": "cmbpnr7ns0003g802x1t9h6w6",
        "name": "AI/ML League"
      }
    },
    "sections": [
      {
        "id": "cmbppd4sm0004g8gnlm1d7ino",
        "name": "Introduction to Machine Learning",
        "description": "Basic concepts, history, and applications of ML",
        "order": 1,
        "weekId": "cmbpofdza0001g8bi8drfjmq0",
        "createdAt": "2025-06-09T23:07:53.351Z",
        "updatedAt": "2025-06-09T23:07:53.351Z",
        "resources": [],
        "_count": {
          "resources": 0
        }
      },
      {
        "id": "cmbppfskn0008g8gn231hf4p5",
        "name": "Python Environment Setup",
        "description": "Setting up Python, pip, virtual environments, and Jupyter notebooks",
        "order": 2,
        "weekId": "cmbpofdza0001g8bi8drfjmq0",
        "createdAt": "2025-06-09T23:09:57.479Z",
        "updatedAt": "2025-06-09T23:09:57.479Z",
        "resources": [],
        "_count": {
          "resources": 0
        }
      }
    ]
  }
}
```

### 4. Get Section by ID
Retrieve a specific section with user progress information.

**Endpoint:** `GET /api/sections/:id`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Section ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbppd4sm0004g8gnlm1d7ino",
    "name": "Introduction to Machine Learning",
    "description": "Basic concepts, history, and applications of ML",
    "order": 1,
    "weekId": "cmbpofdza0001g8bi8drfjmq0",
    "createdAt": "2025-06-09T23:07:53.351Z",
    "updatedAt": "2025-06-09T23:07:53.351Z",
    "week": {
      "id": "cmbpofdza0001g8bi8drfjmq0",
      "name": "Week 1: Introduction to ML & Python Basics",
      "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
      "order": 1,
      "leagueId": "cmbpnr7ns0003g802x1t9h6w6",
      "createdAt": "2025-06-09T22:41:38.950Z",
      "updatedAt": "2025-06-09T22:44:53.992Z",
      "league": {
        "id": "cmbpnr7ns0003g802x1t9h6w6",
        "name": "AI/ML League"
      }
    },
    "resources": [
      {
        "id": "resource_id",
        "title": "ML Fundamentals Video",
        "description": "Introduction video covering ML basics",
        "type": "VIDEO",
        "url": "https://example.com/video",
        "order": 1,
        "progress": {
          "isCompleted": true,
          "completedAt": "2024-01-15T11:30:00Z",
          "personalNote": "Great introduction to ML concepts",
          "markedForRevision": false,
          "timeSpent": 3600
        }
      },
      {
        "id": "resource_id_2",
        "title": "ML Types Article",
        "description": "Comprehensive article on supervised vs unsupervised learning",
        "type": "ARTICLE",
        "url": "https://example.com/article",
        "order": 2,
        "progress": {
          "isCompleted": false,
          "completedAt": null,
          "personalNote": "Need to review this again",
          "markedForRevision": true,
          "timeSpent": 1800
        }
      }
    ],
    "userProgress": {
      "isCompleted": false,
      "completedAt": null,
      "personalNote": null,
      "markedForRevision": false
    }
  }
}
```

**Progress Information:**
- `userProgress.isCompleted`: Whether the user has completed this entire section
- `userProgress.completedAt`: Timestamp when section was completed (null if not completed)  
- `userProgress.personalNote`: User's personal notes for this section
- `userProgress.markedForRevision`: Whether user marked this section for revision

**Resource Progress Information:**
- `resources[].progress.isCompleted`: Whether the specific resource is completed
- `resources[].progress.completedAt`: When the resource was completed
- `resources[].progress.personalNote`: User's notes for this specific resource
- `resources[].progress.markedForRevision`: Whether resource is marked for revision
- `resources[].progress.timeSpent`: Time spent on this resource in seconds

### 5. Update Section
Update section information.

**Endpoint:** `PUT /api/sections/:id`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Section ID

**Request Body (all fields optional):**
```json
{
  "name": "Updated Section Name",
  "description": "Updated section description",
  "order": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbppd4sm0004g8gnlm1d7ino",
    "name": "Updated Section Name",
    "description": "Updated section description",
    "order": 3,
    "weekId": "cmbpofdza0001g8bi8drfjmq0",
    "createdAt": "2025-06-09T23:07:53.351Z",
    "updatedAt": "2025-06-09T23:15:30.123Z",
    "week": {
      "id": "cmbpofdza0001g8bi8drfjmq0",
      "name": "Week 1: Introduction to ML & Python Basics",
      "description": "Updated: Foundations of ML, basic concepts, Python setup, and getting started with scikit-learn",
      "order": 1,
      "leagueId": "cmbpnr7ns0003g802x1t9h6w6",
      "createdAt": "2025-06-09T22:41:38.950Z",
      "updatedAt": "2025-06-09T22:44:53.992Z",
      "league": {
        "id": "cmbpnr7ns0003g802x1t9h6w6",
        "name": "AI/ML League"
      }
    },
    "resources": []
  },
  "message": "Section updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid name length or order value
- `404 Not Found`: Section not found
- `409 Conflict`: New order conflicts with existing section in the same week

### 6. Delete Section
Delete a section and all its associated resources and progress records.

**Endpoint:** `DELETE /api/sections/:id`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Section ID

**Response:**
```json
{
  "success": true,
  "message": "Section \"Introduction to Machine Learning\" deleted successfully",
  "deletedResourcesCount": 3,
  "deletedProgressCount": 5
}
```

**Important Notes:**
- Deletion is permanent and cascades to all section resources and user progress
- Progress records will be deleted, affecting user learning tracking
- The response includes counts of deleted related records for transparency

### 7. Reorder Sections
Reorder multiple sections within a week using batch updates.

**Endpoint:** `PUT /api/weeks/:id/sections/reorder`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Week ID

**Request Body:**
```json
{
  "sectionOrders": [
    {
      "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
      "order": 2
    },
    {
      "sectionId": "cmbppfskn0008g8gn231hf4p5",
      "order": 1
    },
    {
      "sectionId": "section_id_3",
      "order": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmbppfskn0008g8gn231hf4p5",
      "name": "Python Environment Setup",
      "description": "Setting up Python, pip, virtual environments, and Jupyter notebooks",
      "order": 1,
      "weekId": "cmbpofdza0001g8bi8drfjmq0",
      "createdAt": "2025-06-09T23:09:57.479Z",
      "updatedAt": "2025-06-09T23:20:15.123Z",
      "resources": []
    },
    {
      "id": "cmbppd4sm0004g8gnlm1d7ino",
      "name": "Introduction to Machine Learning",
      "description": "Basic concepts, history, and applications of ML",
      "order": 2,
      "weekId": "cmbpofdza0001g8bi8drfjmq0",
      "createdAt": "2025-06-09T23:07:53.351Z",
      "updatedAt": "2025-06-09T23:20:15.456Z",
      "resources": []
    }
  ],
  "message": "Sections reordered successfully"
}
```

**Validation Rules:**
- All sections must belong to the specified week
- Order values must be positive integers
- No duplicate order values allowed
- All sections in the reorder request must exist

---

## Business Logic & Validation

### Section Creation Rules
1. **Unique Order**: Each section must have a unique order within its week
2. **Name Length**: Section names cannot exceed 100 characters
3. **Positive Order**: Order must be a positive integer (≥ 1)
4. **Valid Week**: Week must exist in the system
5. **Required Fields**: name, order, and weekId are mandatory

### Section Ordering System
- Sections are ordered within weeks using positive integers
- Order 1 represents the first section in the learning sequence
- Gaps in ordering are allowed (e.g., 1, 3, 5)
- Reordering is done through batch updates to maintain consistency

### Progress Tracking Integration
- Each user can have progress records for individual sections
- Progress includes completion status, completion date, personal notes, and revision flags
- Deleting a section removes all associated progress records

### Audit Logging
All section operations are automatically logged:
- `SECTION_CREATED`: When a new section is created
- `SECTION_UPDATED`: When section details are modified
- `SECTION_DELETED`: When a section is removed
- `SECTION_REORDERED`: When section order is changed

---

## Error Handling

### Common Error Responses

**Validation Error:**
```json
{
  "success": false,
  "error": "Name is required, Order must be a positive integer"
}
```

**Authentication Error:**
```json
{
  "success": false,
  "error": "Access token is required"
}
```

**Authorization Error:**
```json
{
  "success": false,
  "error": "Insufficient permissions. Chief Pathfinder access required."
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "error": "Section not found"
}
```

**Conflict Error:**
```json
{
  "success": false,
  "error": "A section with order 1 already exists in this week"
}
```

---

## Testing Examples

### Complete Section Management Workflow

```bash
# 1. Login as Grand Pathfinder
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@openlearn.com",
    "password": "SecurePass123!"
  }'

# Save the access token from response
export ACCESS_TOKEN="your_access_token_here"

# 2. Create first section
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Introduction to Machine Learning",
    "description": "Basic concepts, history, and applications of ML",
    "order": 1,
    "weekId": "cmbpofdza0001g8bi8drfjmq0"
  }'

# 3. Create second section
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Python Environment Setup",
    "description": "Setting up Python, pip, virtual environments, and Jupyter notebooks",
    "order": 2,
    "weekId": "cmbpofdza0001g8bi8drfjmq0"
  }'

# 4. Get all sections for the week
curl -X GET "http://localhost:3001/api/weeks/cmbpofdza0001g8bi8drfjmq0/sections" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Get specific section details
curl -X GET "http://localhost:3001/api/sections/SECTION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 6. Update section
curl -X PUT http://localhost:3001/api/sections/SECTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Updated Section Name",
    "description": "Updated description"
  }'

# 7. Reorder sections
curl -X PUT http://localhost:3001/api/weeks/cmbpofdza0001g8bi8drfjmq0/sections/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "sectionOrders": [
      {
        "sectionId": "SECTION_ID_2",
        "order": 1
      },
      {
        "sectionId": "SECTION_ID_1",
        "order": 2
      }
    ]
  }'

# 8. Get admin view of all sections with filtering
curl -X GET "http://localhost:3001/api/sections?weekId=cmbpofdza0001g8bi8drfjmq0&page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 9. Delete section (careful - this is permanent!)
curl -X DELETE http://localhost:3001/api/sections/SECTION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Test Error Scenarios

```bash
# Test duplicate order error
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Duplicate Order Section",
    "description": "This should fail",
    "order": 1,
    "weekId": "cmbpofdza0001g8bi8drfjmq0"
  }'

# Test invalid order value
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Invalid Order Section",
    "description": "This should fail",
    "order": 0,
    "weekId": "cmbpofdza0001g8bi8drfjmq0"
  }'

# Test missing required fields
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "description": "Missing name and order"
  }'

# Test non-existent week
curl -X POST http://localhost:3001/api/sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Test Section",
    "order": 1,
    "weekId": "non_existent_week_id"
  }'
```

---

## Integration Notes

### Frontend Integration
- Use the section endpoints to build learning pathways
- Implement section completion tracking using the progress information
- Show sections in order within weeks for structured learning
- Allow admins to reorder sections using drag-and-drop interfaces

### Progress Tracking System
- Section completion feeds into overall week and league progress
- Personal notes allow learners to track their thoughts and insights
- Revision markers help identify sections that need review

### Resource Management
- Sections serve as containers for learning resources
- Each section can contain multiple resources (videos, articles, links)
- Resources within sections should also be ordered for optimal learning flow

### Next Steps
After implementing Section Management, consider:
1. **Section Resource Management** - CRUD operations for resources within sections
2. **Progress Tracking Endpoints** - Mark sections complete, add notes, set revision flags
3. **User Enrollment System** - Allow users to enroll in cohorts/specializations
4. **Badge and Achievement System** - Award badges upon league completion

---

## Security Considerations

- All endpoints require authentication
- Role-based access control prevents unauthorized modifications
- Audit logging tracks all section-related changes
- Input validation prevents malicious data injection
- Cascading deletes are logged for accountability

## Performance Considerations

- Pagination is implemented for large result sets
- Database queries include appropriate indexes
- Related data is efficiently loaded using Prisma includes
- Bulk operations (reordering) use database transactions for consistency
