# OpenLearn Assignment Management API Documentation

## Overview
The Assignment Management System handles the creation, submission, and tracking of assignments within the OpenLearn platform. Each league can have one assignment that students can submit with various formats (text, files, GitHub repos, live URLs).

## Base URL
```
http://localhost:3001/api
```

## Authentication
All assignment endpoints require authentication via JWT token in the Authorization header:
```json
{
  "Authorization": "Bearer <access_token>"
}
```

## Role-Based Access Control (RBAC)

### Assignment Creation & Management
- **Pathfinder+** (PATHFINDER, CHIEF_PATHFINDER, GRAND_PATHFINDER): Can create and manage assignments
- **All authenticated users**: Can view assignments for leagues they're enrolled in
- **All authenticated users**: Can submit assignments for leagues they're enrolled in

---

## Admin Assignment Endpoints (via `/api/admin`)

### 1. Create Assignment
Create a new assignment for a specific league.

**Endpoint:** `POST /api/admin/assignments`  
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
  "title": "AI/ML Final Project",
  "description": "Build a machine learning model to solve a real-world problem. Include data preprocessing, model training, evaluation, and deployment.",
  "leagueId": "league_id_here",
  "dueDate": "2025-07-15T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment_id",
    "title": "AI/ML Final Project",
    "description": "Build a machine learning model...",
    "dueDate": "2025-07-15T23:59:59.000Z",
    "leagueId": "league_id",
    "league": {
      "id": "league_id",
      "name": "AI/ML"
    },
    "createdAt": "2025-06-10T10:00:00.000Z",
    "updatedAt": "2025-06-10T10:00:00.000Z"
  },
  "message": "Assignment created successfully"
}
```

### 2. Get All Assignments (Admin View)
Retrieve all assignments with pagination and submission counts.

**Endpoint:** `GET /api/admin/assignments`  
**Access:** Chief Pathfinder+  
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assignment_id",
        "title": "AI/ML Final Project",
        "description": "Build a machine learning model...",
        "dueDate": "2025-07-15T23:59:59.000Z",
        "league": {
          "id": "league_id",
          "name": "AI/ML"
        },
        "_count": {
          "submissions": 15
        },
        "createdAt": "2025-06-10T10:00:00.000Z",
        "updatedAt": "2025-06-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "message": "Assignments retrieved successfully"
}
```

### 3. Get Assignment by League
Retrieve assignment for a specific league with all submissions.

**Endpoint:** `GET /api/admin/assignments/league/:leagueId`  
**Access:** Chief Pathfinder+  

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment_id",
    "title": "AI/ML Final Project",
    "description": "Build a machine learning model...",
    "dueDate": "2025-07-15T23:59:59.000Z",
    "league": {
      "id": "league_id",
      "name": "AI/ML"
    },
    "submissions": [
      {
        "id": "submission_id",
        "content": "My ML project analyzes housing prices...",
        "fileUrl": "https://storage.com/project.zip",
        "githubUrl": "https://github.com/user/ml-project",
        "liveUrl": "https://ml-app.herokuapp.com",
        "status": "SUBMITTED",
        "submittedAt": "2025-06-12T14:30:00.000Z",
        "user": {
          "id": "user_id",
          "name": "John Pioneer",
          "email": "student@openlearn.com"
        }
      }
    ]
  },
  "message": "Assignment retrieved successfully"
}
```

---

### 4. Update Assignment
Update an existing assignment (title, description, or due date).

**Endpoint:** `PUT /api/admin/assignments/:assignmentId`  
**Access:** Chief Pathfinder+  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:** (All fields are optional)
```json
{
  "title": "Updated AI/ML Final Project",
  "description": "Build an advanced machine learning model...",
  "dueDate": "2025-08-15T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment_id",
    "title": "Updated AI/ML Final Project",
    "description": "Build an advanced machine learning model...",
    "dueDate": "2025-08-15T23:59:59.000Z",
    "league": {
      "id": "league_id",
      "name": "AI/ML"
    },
    "_count": {
      "submissions": 15
    },
    "createdAt": "2025-06-10T10:00:00.000Z",
    "updatedAt": "2025-06-12T15:30:00.000Z"
  },
  "message": "Assignment updated successfully"
}
```

### 5. Delete Assignment
Delete an assignment (only allowed if no submissions exist).

**Endpoint:** `DELETE /api/admin/assignments/:assignmentId`  
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
  "message": "Assignment 'AI/ML Final Project' deleted successfully"
}
```

**Error Response (if submissions exist):**
```json
{
  "success": false,
  "error": "Cannot delete assignment with existing submissions. This assignment has 15 submission(s)."
}
```

---

## Student Assignment Endpoints

### 4. Submit Assignment
Submit an assignment with various content types.

**Endpoint:** `POST /api/admin/assignments/:assignmentId/submit`  
**Access:** All authenticated users (must be enrolled in league)  
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
  "content": "I built a machine learning model that predicts housing prices using linear regression. The model achieved 85% accuracy on the test set.",
  "fileUrl": "https://storage.googleapis.com/openlearn/submissions/project.zip",
  "githubUrl": "https://github.com/johnpioneer/ml-housing-prediction",
  "liveUrl": "https://housing-predictor.herokuapp.com"
}
```

**Note:** All fields in the request body are optional, but at least one should be provided.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission_id",
    "assignmentId": "assignment_id",
    "userId": "user_id",
    "content": "I built a machine learning model...",
    "fileUrl": "https://storage.googleapis.com/openlearn/submissions/project.zip",
    "githubUrl": "https://github.com/johnpioneer/ml-housing-prediction",
    "liveUrl": "https://housing-predictor.herokuapp.com",
    "status": "SUBMITTED",
    "submittedAt": "2025-06-12T14:30:00.000Z",
    "assignment": {
      "id": "assignment_id",
      "title": "AI/ML Final Project"
    },
    "createdAt": "2025-06-12T14:30:00.000Z",
    "updatedAt": "2025-06-12T14:30:00.000Z"
  },
  "message": "Assignment submitted successfully"
}
```

### 5. Get User Submissions
Retrieve assignment submissions for a user.

**Endpoint:** `GET /api/admin/assignments/submissions`  
**Access:** All authenticated users (own submissions) or Pathfinder+ (any user with ?userId=)  
**Query Parameters:**
- `userId` (optional): View submissions for specific user (Pathfinder+ only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "submission_id",
      "content": "I built a machine learning model...",
      "fileUrl": "https://storage.googleapis.com/openlearn/submissions/project.zip",
      "githubUrl": "https://github.com/johnpioneer/ml-housing-prediction",
      "liveUrl": "https://housing-predictor.herokuapp.com",
      "status": "SUBMITTED",
      "submittedAt": "2025-06-12T14:30:00.000Z",
      "assignment": {
        "id": "assignment_id",
        "title": "AI/ML Final Project",
        "description": "Build a machine learning model...",
        "dueDate": "2025-07-15T23:59:59.000Z",
        "league": {
          "id": "league_id",
          "name": "AI/ML"
        }
      },
      "createdAt": "2025-06-12T14:30:00.000Z",
      "updatedAt": "2025-06-12T14:30:00.000Z"
    }
  ],
  "message": "Submissions retrieved successfully"
}
```

---

## Assignment Status Types

### AssignmentStatus Enum
```typescript
enum AssignmentStatus {
  NOT_SUBMITTED = "NOT_SUBMITTED",
  SUBMITTED = "SUBMITTED"
}
```

---

## Business Logic & Validation

### Assignment Creation Rules
1. **One Assignment Per League**: Each league can have only one assignment
2. **League Must Exist**: Assignment can only be created for existing leagues
3. **Due Date**: Optional, but if provided must be a valid future date
4. **Title & Description**: Required fields with proper sanitization

### Submission Rules
1. **Enrollment Required**: Users must be enrolled in the league to submit assignments
2. **Assignment Must Exist**: Cannot submit to non-existent assignments
3. **Flexible Content**: At least one of content, fileUrl, githubUrl, or liveUrl must be provided
4. **Resubmission Allowed**: Users can update their submissions (upsert operation)
5. **Auto Status Update**: Status automatically changes to "SUBMITTED" upon submission

### Security & Validation
1. **Input Sanitization**: All text inputs are sanitized before storage
2. **URL Validation**: File URLs and live URLs should be valid (client-side validation recommended)
3. **File Size Limits**: Implement file upload size restrictions (recommended: 10MB max)
4. **Authentication Required**: All endpoints require valid JWT tokens
5. **Role-based Access**: Proper RBAC implementation for admin vs student operations

---

## Error Handling

### Common Error Responses

**400 - Bad Request:**
```json
{
  "success": false,
  "error": "Title, description, and leagueId are required"
}
```

**403 - Forbidden:**
```json
{
  "success": false,
  "error": "You must be enrolled in this league to submit assignments"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "error": "Assignment not found"
}
```

**409 - Conflict:**
```json
{
  "success": false,
  "error": "Assignment already exists for this league"
}
```

---

## 🔧 Testing Examples

### Test Assignment Creation
```bash
# Create assignment for AI/ML league
curl -X POST http://localhost:3001/api/admin/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "AI/ML Final Project",
    "description": "Build a machine learning model to solve a real-world problem",
    "leagueId": "cm2z1abc123def456",
    "dueDate": "2025-07-15T23:59:59.000Z"
  }'
```

### Test Assignment Submission
```bash
# Submit assignment as student
curl -X POST http://localhost:3001/api/admin/assignments/cm2z1ghi789jkl012/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <student_token>" \
  -d '{
    "content": "I built a housing price prediction model using linear regression",
    "githubUrl": "https://github.com/student/housing-ml",
    "liveUrl": "https://housing-predictor.vercel.app"
  }'
```

### Test Get All Assignments
```bash
# Get all assignments (admin view)
curl -X GET "http://localhost:3001/api/admin/assignments?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

### Test Update Assignment
```bash
# Update assignment title and description
curl -X PUT http://localhost:3001/api/admin/assignments/cm2z1abc123def456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "Updated AI/ML Final Project",
    "description": "Build an advanced machine learning model with deployment",
    "dueDate": "2025-08-15T23:59:59.000Z"
  }'
```

### Test Delete Assignment
```bash
# Delete assignment (only works if no submissions exist)
curl -X DELETE http://localhost:3001/api/admin/assignments/cm2z1abc123def456 \
  -H "Authorization: Bearer <admin_token>"
```

### Test Get User Submissions
```bash
# Get current user's submissions
curl -X GET http://localhost:3001/api/admin/assignments/submissions \
  -H "Authorization: Bearer <student_token>"

# Get specific user's submissions (admin only)
curl -X GET "http://localhost:3001/api/admin/assignments/submissions?userId=cm2z1user123" \
  -H "Authorization: Bearer <admin_token>"
```

---

## Integration Notes

### Frontend Integration
1. **File Uploads**: Implement file upload to cloud storage (AWS S3, Google Cloud Storage) and pass URLs to the API
2. **Real-time Updates**: Consider WebSocket integration for real-time submission notifications
3. **Rich Text Editor**: For assignment descriptions and submission content
4. **GitHub Integration**: Validate GitHub URLs and potentially fetch repository metadata
5. **Due Date Handling**: Implement countdown timers and late submission warnings

