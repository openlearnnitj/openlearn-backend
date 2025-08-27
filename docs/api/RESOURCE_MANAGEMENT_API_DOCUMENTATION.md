# OpenLearn Resource Management API Documentation

## Overview
This document covers the Resource Management endpoints for the OpenLearn platform. Resources are the actual learning materials within sections - videos, articles, blogs, external links, and documents. They represent the concrete educational content that students consume to learn.

## Educational Hierarchy
```
Cohort → Specialization → League → Week → Section → Resource ← You are here!
```

Resources are the final level of the content hierarchy and contain the actual learning materials that students interact with.

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
- **CHIEF_PATHFINDER**: Can create, update, and delete resources
- **PATHFINDER**: Can view all resources (admin view with filtering)
- **PIONEER**: Can view resources within sections they have access to
- **LUMINARY**: Can view resources within sections they have access to

## Resource Types
The system supports the following resource types:

| Type | Description | Example Use Cases |
|------|-------------|-------------------|
| `VIDEO` | Video content (YouTube, Vimeo, etc.) | Lectures, tutorials, demonstrations |
| `ARTICLE` | Text-based articles and blog posts | Written explanations, theory |
| `EXTERNAL_LINK` | Links to external websites | Course platforms, tools, references |
| `BLOG` | Internal blog posts | Platform-specific content |

---

## Resource Endpoints

### 1. Create Resource
Create a new resource within a section.

**Endpoint:** `POST /api/sections/:sectionId/resources`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `sectionId` (string, required): ID of the parent section

**Request Body:**
```json
{
  "title": "Machine Learning Fundamentals - Complete Introduction Video",
  "url": "https://youtu.be/ukzFI9rgwfU",
  "type": "VIDEO",
  "order": 1
}
```

**Field Descriptions:**
- `title` (string, required): Resource title (max 200 characters)
- `url` (string, required): Valid URL to the resource
- `type` (string, required): Resource type (`VIDEO`, `ARTICLE`, `EXTERNAL_LINK`, `BLOG`)
- `order` (integer, required): Positive integer for resource ordering within the section

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbpq2u5g0001g8c2wfw4sg0k",
    "title": "Machine Learning Fundamentals - Complete Introduction Video",
    "url": "https://youtu.be/ukzFI9rgwfU",
    "type": "VIDEO",
    "order": 1,
    "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
    "createdAt": "2025-06-09T23:27:52.613Z",
    "updatedAt": "2025-06-09T23:27:52.613Z",
    "section": {
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
      }
    }
  },
  "message": "Resource created successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid order, title too long, or invalid URL
- `404 Not Found`: Section not found
- `409 Conflict`: Resource with same order already exists in the section

### 2. Get Resources by Section
Retrieve all resources for a specific section (ordered by position).

**Endpoint:** `GET /api/sections/:sectionId/resources`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `sectionId` (string, required): Section ID

**Response:**
```json
{
  "success": true,
  "data": {
    "section": {
      "id": "cmbppd4sm0004g8gnlm1d7ino",
      "name": "Introduction to Machine Learning",
      "description": "Basic concepts, history, and applications of ML",
      "order": 1,
      "week": {
        "id": "cmbpofdza0001g8bi8drfjmq0",
        "name": "Week 1: Introduction to ML & Python Basics",
        "league": {
          "id": "cmbpnr7ns0003g802x1t9h6w6",
          "name": "AI/ML League"
        }
      }
    },
    "resources": [
      {
        "id": "cmbpq2u5g0001g8c2wfw4sg0k",
        "title": "Machine Learning Fundamentals - Complete Introduction Video",
        "url": "https://youtu.be/ukzFI9rgwfU",
        "type": "VIDEO",
        "order": 1,
        "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
        "createdAt": "2025-06-09T23:27:52.613Z",
        "updatedAt": "2025-06-09T23:31:50.849Z"
      },
      {
        "id": "cmbpq3ylj0005g8c2ubp9pc80",
        "title": "Machine Learning Terminology and Concepts",
        "url": "https://towardsdatascience.com/machine-learning-basics",
        "type": "ARTICLE",
        "order": 2,
        "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
        "createdAt": "2025-06-09T23:28:45.032Z",
        "updatedAt": "2025-06-09T23:28:45.032Z"
      },
      {
        "id": "cmbpq4r5f0009g8c28b4b9b08",
        "title": "Coursera ML Course - Week 1 Exercises",
        "url": "https://www.coursera.org/learn/machine-learning",
        "type": "EXTERNAL_LINK",
        "order": 3,
        "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
        "createdAt": "2025-06-09T23:29:22.035Z",
        "updatedAt": "2025-06-09T23:29:22.035Z"
      }
    ]
  }
}
```

### 3. Get All Resources (Admin View)
Retrieve all resources with filtering and pagination (admin view).

**Endpoint:** `GET /api/resources`  
**Access:** Pathfinder+  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Query Parameters:**
- `sectionId` (optional): Filter resources by specific section
- `weekId` (optional): Filter resources by week (shows all resources in all sections of the week)
- `leagueId` (optional): Filter resources by league (shows all resources in all weeks/sections of the league)
- `type` (optional): Filter by resource type (`VIDEO`, `ARTICLE`, `EXTERNAL_LINK`, `BLOG`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request:**
```
GET /api/resources?type=VIDEO&page=1&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "id": "cmbpq2u5g0001g8c2wfw4sg0k",
        "title": "Machine Learning Fundamentals - Complete Introduction Video",
        "url": "https://youtu.be/ukzFI9rgwfU",
        "type": "VIDEO",
        "order": 1,
        "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
        "createdAt": "2025-06-09T23:27:52.613Z",
        "updatedAt": "2025-06-09T23:31:50.849Z",
        "section": {
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
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### 4. Get Resource by ID
Retrieve a specific resource with full hierarchy details.

**Endpoint:** `GET /api/resources/:id`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Resource ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbpq2u5g0001g8c2wfw4sg0k",
    "title": "Machine Learning Fundamentals - Complete Introduction Video",
    "url": "https://youtu.be/ukzFI9rgwfU",
    "type": "VIDEO",
    "order": 1,
    "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
    "createdAt": "2025-06-09T23:27:52.613Z",
    "updatedAt": "2025-06-09T23:31:50.849Z",
    "section": {
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
      }
    }
  }
}
```

### 5. Update Resource
Update resource information.

**Endpoint:** `PUT /api/resources/:id`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Resource ID

**Request Body (all fields optional):**
```json
{
  "title": "Updated Resource Title",
  "url": "https://updated-url.com",
  "type": "ARTICLE",
  "order": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cmbpq2u5g0001g8c2wfw4sg0k",
    "title": "Updated Resource Title",
    "url": "https://updated-url.com",
    "type": "ARTICLE",
    "order": 2,
    "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
    "createdAt": "2025-06-09T23:27:52.613Z",
    "updatedAt": "2025-06-09T23:35:15.123Z",
    "section": {
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
      }
    }
  },
  "message": "Resource updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid title length, order value, type, or URL format
- `404 Not Found`: Resource not found
- `409 Conflict`: New order conflicts with existing resource in the same section

### 6. Delete Resource
Delete a resource permanently.

**Endpoint:** `DELETE /api/resources/:id`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (string, required): Resource ID

**Response:**
```json
{
  "success": true,
  "message": "Resource \"Machine Learning Fundamentals - Complete Introduction Video\" deleted successfully"
}
```

**Important Notes:**
- Deletion is permanent and cannot be undone
- Any user progress tracking for this resource will be lost

### 7. Reorder Resources
Reorder multiple resources within a section using batch updates.

**Endpoint:** `PUT /api/sections/:sectionId/resources/reorder`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `sectionId` (string, required): Section ID

**Request Body:**
```json
{
  "resourceOrders": [
    {
      "resourceId": "cmbpq3ylj0005g8c2ubp9pc80",
      "order": 1
    },
    {
      "resourceId": "cmbpq2u5g0001g8c2wfw4sg0k",
      "order": 2
    },
    {
      "resourceId": "cmbpq4r5f0009g8c28b4b9b08",
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
      "id": "cmbpq3ylj0005g8c2ubp9pc80",
      "title": "Machine Learning Terminology and Concepts",
      "url": "https://towardsdatascience.com/machine-learning-basics",
      "type": "ARTICLE",
      "order": 1,
      "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
      "createdAt": "2025-06-09T23:28:45.032Z",
      "updatedAt": "2025-06-09T23:40:15.123Z"
    },
    {
      "id": "cmbpq2u5g0001g8c2wfw4sg0k",
      "title": "Machine Learning Fundamentals - Complete Introduction Video",
      "url": "https://youtu.be/ukzFI9rgwfU",
      "type": "VIDEO",
      "order": 2,
      "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
      "createdAt": "2025-06-09T23:27:52.613Z",
      "updatedAt": "2025-06-09T23:40:15.456Z"
    },
    {
      "id": "cmbpq4r5f0009g8c28b4b9b08",
      "title": "Coursera ML Course - Week 1 Exercises",
      "url": "https://www.coursera.org/learn/machine-learning",
      "type": "EXTERNAL_LINK",
      "order": 3,
      "sectionId": "cmbppd4sm0004g8gnlm1d7ino",
      "createdAt": "2025-06-09T23:29:22.035Z",
      "updatedAt": "2025-06-09T23:40:15.789Z"
    }
  ],
  "message": "Resources reordered successfully"
}
```

**Validation Rules:**
- All resources must belong to the specified section
- Order values must be positive integers
- No duplicate order values allowed
- All resources in the reorder request must exist

---

## Business Logic & Validation

### Resource Creation Rules
1. **Unique Order**: Each resource must have a unique order within its section
2. **Title Length**: Resource titles cannot exceed 200 characters
3. **Positive Order**: Order must be a positive integer (≥ 1)
4. **Valid URL**: Must be a properly formatted URL
5. **Valid Type**: Must be one of the supported resource types
6. **Valid Section**: Section must exist in the system
7. **Required Fields**: title, url, type, and order are mandatory

### Resource Ordering System
- Resources are ordered within sections using positive integers
- Order 1 represents the first resource in the learning sequence
- Gaps in ordering are allowed (e.g., 1, 3, 5)
- Reordering is done through batch updates to maintain consistency

### URL Validation
- Basic URL format validation is performed
- Supports HTTP and HTTPS protocols
- No restrictions on domain (supports YouTube, external sites, etc.)

### Resource Types and Use Cases

| Type | Typical URLs | Best Practices |
|------|-------------|----------------|
| `VIDEO` | YouTube, Vimeo, direct video links | Use for lectures, tutorials, demonstrations |
| `ARTICLE` | Medium, blog posts, documentation | Use for written explanations and theory |
| `EXTERNAL_LINK` | Course platforms, tools, references | Use for external courses, tools, datasets |
| `BLOG` | Internal platform blogs | Use for platform-specific content |

### Audit Logging
All resource operations are automatically logged:
- `RESOURCE_CREATED`: When a new resource is created
- `RESOURCE_UPDATED`: When resource details are modified
- `RESOURCE_DELETED`: When a resource is removed
- `RESOURCE_REORDERED`: When resource order is changed

---

## Error Handling

### Common Error Responses

**Validation Error:**
```json
{
  "success": false,
  "error": "Title is required, URL must be valid"
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
  "error": "Resource not found"
}
```

**Section Not Found:**
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
  "error": "A resource with order 1 already exists in this section"
}
```

**Invalid URL Error:**
```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Invalid Type Error:**
```json
{
  "success": false,
  "error": "Invalid resource type. Must be one of: VIDEO, ARTICLE, EXTERNAL_LINK, BLOG"
}
```

---

## Testing Examples

### Complete Resource Management Workflow

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

# 2. Create first resource (Video)
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Machine Learning Fundamentals - Complete Introduction Video",
    "url": "https://youtu.be/ukzFI9rgwfU",
    "type": "VIDEO",
    "order": 1
  }'

# 3. Create second resource (Article)
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Machine Learning Terminology and Concepts",
    "url": "https://towardsdatascience.com/machine-learning-basics",
    "type": "ARTICLE",
    "order": 2
  }'

# 4. Create third resource (External Link)
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Coursera ML Course - Week 1 Exercises",
    "url": "https://www.coursera.org/learn/machine-learning",
    "type": "EXTERNAL_LINK",
    "order": 3
  }'

# 5. Get all resources for the section
curl -X GET "http://localhost:3001/api/sections/SECTION_ID/resources" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 6. Get specific resource details
curl -X GET "http://localhost:3001/api/resources/RESOURCE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 7. Update resource
curl -X PUT http://localhost:3001/api/resources/RESOURCE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Updated Resource Title",
    "url": "https://updated-url.com"
  }'

# 8. Get admin view of all resources with filtering
curl -X GET "http://localhost:3001/api/resources?type=VIDEO&page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 9. Reorder resources
curl -X PUT http://localhost:3001/api/sections/SECTION_ID/resources/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "resourceOrders": [
      {
        "resourceId": "RESOURCE_ID_2",
        "order": 1
      },
      {
        "resourceId": "RESOURCE_ID_1",
        "order": 2
      },
      {
        "resourceId": "RESOURCE_ID_3",
        "order": 3
      }
    ]
  }'

# 10. Delete resource (careful - this is permanent!)
curl -X DELETE http://localhost:3001/api/resources/RESOURCE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Test Error Scenarios

```bash
# Test duplicate order error
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Duplicate Order Resource",
    "url": "https://example.com",
    "type": "ARTICLE",
    "order": 1
  }'

# Test invalid URL
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Invalid URL Resource",
    "url": "not-a-valid-url",
    "type": "ARTICLE",
    "order": 4
  }'

# Test invalid resource type
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Invalid Type Resource",
    "url": "https://example.com",
    "type": "INVALID_TYPE",
    "order": 4
  }'

# Test missing required fields
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "url": "https://example.com"
  }'

# Test non-existent section
curl -X POST http://localhost:3001/api/sections/non_existent_section_id/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Test Resource",
    "url": "https://example.com",
    "type": "ARTICLE",
    "order": 1
  }'
```

### Test Different Resource Types

```bash
# Create VIDEO resource
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Python Programming Tutorial",
    "url": "https://youtu.be/rfscVS0vtbw",
    "type": "VIDEO",
    "order": 1
  }'

# Create ARTICLE resource
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Understanding Neural Networks",
    "url": "https://towardsdatascience.com/neural-networks-explained",
    "type": "ARTICLE",
    "order": 2
  }'

# Create EXTERNAL_LINK resource
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Kaggle Learn - Intro to Machine Learning",
    "url": "https://www.kaggle.com/learn/intro-to-machine-learning",
    "type": "EXTERNAL_LINK",
    "order": 3
  }'

# Create BLOG resource
curl -X POST http://localhost:3001/api/sections/SECTION_ID/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "OpenLearn Platform Guide",
    "url": "https://openlearn.platform.com/guide",
    "type": "BLOG",
    "order": 4
  }'
```

---

## Integration Notes

### Frontend Integration
- Use the resource endpoints to display learning materials in sections
- Implement different UI components for different resource types (video player, article reader, external link button)
- Show resources in order within sections for structured learning
- Allow admins to reorder resources using drag-and-drop interfaces
