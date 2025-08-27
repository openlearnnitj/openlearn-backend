# OpenLearn Progress Tracking API Documentation

## Overview
The Progress Tracking API enables students (Pioneers) to enroll in cohorts and leagues, track their learning progress through sections, and earn badges upon completion. It provides comprehensive analytics for both students and administrators to monitor learning progress across the OpenLearn platform.

## Base URL
```
http://localhost:3001/api/progress
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Role-Based Access Control (RBAC)
- **PIONEER/LUMINARY**: Can enroll themselves, track their own progress, and view their own dashboard
- **PATHFINDER+**: Can enroll other users, view any user's progress, and access admin analytics
- **GRAND_PATHFINDER**: Full access to all progress tracking features

---

## Progress Tracking Endpoints

### 1. Enroll User in Cohort/League
Enroll a user in a specific cohort and league combination to begin tracking their progress.

**Endpoint:** `POST /api/progress/enroll`  
**Access:** All authenticated users (self-enrollment) or Pathfinder+ (enroll others)  

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
  "userId": "user_id_to_enroll",    // Optional: defaults to current user
  "cohortId": "cohort_id",          // Required: target cohort
  "leagueId": "league_id"           // Required: target league
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "enrollment_id",
      "userId": "user_id",
      "cohortId": "cohort_id",
      "leagueId": "league_id",
      "enrolledAt": "2025-06-10T00:15:00.000Z",
      "updatedAt": "2025-06-10T00:15:00.000Z",
      "user": {
        "id": "user_id",
        "name": "John Pioneer",
        "email": "student@openlearn.com",
        "role": "PIONEER"
      },
      "cohort": {
        "id": "cohort_id",
        "name": "Cohort 1"
      },
      "league": {
        "id": "league_id",
        "name": "AI/ML League"
      }
    }
  },
  "message": "User enrolled successfully"
}
```

**Business Rules:**
- Users can only enroll in active cohorts
- Users cannot be enrolled in the same cohort/league combination twice
- Target user must have ACTIVE status
- Pathfinder+ roles can enroll other users

---

### 2. Mark Section as Completed
Mark a specific section as completed and optionally add personal notes or revision flags.

**Endpoint:** `POST /api/progress/sections/:sectionId/complete`  
**Access:** All authenticated users (only for their own progress)  

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
  "personalNote": "This section was challenging but very informative. Need to review the neural network concepts again.",
  "markedForRevision": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": {
      "id": "progress_id",
      "userId": "user_id",
      "sectionId": "section_id",
      "isCompleted": true,
      "completedAt": "2025-06-10T00:20:00.000Z",
      "personalNote": "This section was challenging but very informative. Need to review the neural network concepts again.",
      "markedForRevision": false,
      "createdAt": "2025-06-10T00:20:00.000Z",
      "updatedAt": "2025-06-10T00:20:00.000Z",
      "section": {
        "id": "section_id",
        "name": "Introduction to Neural Networks",
        "order": 1,
        "week": {
          "id": "week_id",
          "name": "Week 1: ML Fundamentals",
          "league": {
            "id": "league_id",
            "name": "AI/ML League"
          }
        }
      }
    }
  },
  "message": "Section marked as completed successfully"
}
```

**Automatic Badge Awarding:**
- If all sections in a league are completed, the system automatically checks for and awards league badges
- Audit logs are created for section completion and badge awarding

---

### 3. Update Section Progress
Update section progress without marking as complete (for notes and revision flags only).

**Endpoint:** `PUT /api/progress/sections/:sectionId`  
**Access:** All authenticated users (only for their own progress)  

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
  "personalNote": "Updated notes after reviewing the material again.",
  "markedForRevision": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": {
      "id": "progress_id",
      "userId": "user_id",
      "sectionId": "section_id",
      "isCompleted": false,
      "completedAt": null,
      "personalNote": "Updated notes after reviewing the material again.",
      "markedForRevision": true,
      "createdAt": "2025-06-10T00:25:00.000Z",
      "updatedAt": "2025-06-10T00:25:00.000Z",
      "section": {
        "id": "section_id",
        "name": "Introduction to Neural Networks",
        "order": 1
      }
    }
  },
  "message": "Section progress updated successfully"
}
```

---

### 4. Get League Progress
Retrieve detailed progress for a specific league, including all weeks, sections, and completion status.

**Endpoint:** `GET /api/progress/leagues/:leagueId`  
**Access:** All authenticated users (own progress) or Pathfinder+ (any user with ?userId=)  

**Query Parameters:**
- `userId` (optional): View progress for specific user (Pathfinder+ only)

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
    "user": {
      "id": "user_id",
      "name": "John Pioneer",
      "email": "student@openlearn.com"
    },
    "league": {
      "id": "league_id",
      "name": "AI/ML League",
      "description": "Artificial Intelligence and Machine Learning fundamentals"
    },
    "enrollment": {
      "enrolledAt": "2025-06-10T00:15:00.000Z"
    },
    "progress": {
      "totalSections": 5,
      "completedSections": 2,
      "progressPercentage": 40,
      "weeks": [
        {
          "id": "week_1_id",
          "name": "Week 1: ML Fundamentals",
          "order": 1,
          "sections": [
            {
              "id": "section_1_id",
              "name": "Introduction to Machine Learning",
              "order": 1,
              "resourceCount": 3,
              "progress": {
                "isCompleted": true,
                "completedAt": "2025-06-10T00:20:00.000Z",
                "personalNote": "Great introduction to the field",
                "markedForRevision": false
              }
            },
            {
              "id": "section_2_id",
              "name": "Python for Data Science",
              "order": 2,
              "resourceCount": 4,
              "progress": {
                "isCompleted": false,
                "completedAt": null,
                "personalNote": null,
                "markedForRevision": false
              }
            }
          ]
        }
      ]
    },
    "badge": {
      "id": "badge_id",
      "name": "AI/ML Fundamentals Badge",
      "description": "Awarded for completing all AI/ML League sections",
      "imageUrl": "https://example.com/badge.png",
      "earnedAt": "2025-06-10T01:00:00.000Z"
    }
  },
  "message": "League progress retrieved successfully"
}
```

---

### 5. Get User Dashboard
Retrieve comprehensive dashboard showing user's progress across all enrollments, badges, and specializations.

**Endpoint:** `GET /api/progress/dashboard`  
**Access:** All authenticated users (own dashboard) or Pathfinder+ (any user with ?userId=)  

**Query Parameters:**
- `userId` (optional): View dashboard for specific user (Pathfinder+ only)

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
    "user": {
      "id": "user_id",
      "name": "John Pioneer",
      "email": "student@openlearn.com",
      "role": "PIONEER",
      "createdAt": "2025-06-09T23:59:23.131Z"
    },
    "statistics": {
      "totalEnrollments": 2,
      "totalSections": 8,
      "totalCompletedSections": 5,
      "overallProgress": 63,
      "badgesEarned": 1,
      "specializationsCompleted": 0
    },
    "enrollments": [
      {
        "enrollmentId": "enrollment_1_id",
        "cohort": {
          "id": "cohort_id",
          "name": "Cohort 1"
        },
        "league": {
          "id": "ai_ml_league_id",
          "name": "AI/ML League",
          "description": "Artificial Intelligence fundamentals"
        },
        "enrolledAt": "2025-06-10T00:15:00.000Z",
        "progress": {
          "totalSections": 5,
          "completedSections": 3,
          "progressPercentage": 60
        }
      },
      {
        "enrollmentId": "enrollment_2_id",
        "cohort": {
          "id": "cohort_id",
          "name": "Cohort 1"
        },
        "league": {
          "id": "finance_league_id",
          "name": "Finance League",
          "description": "Financial markets and trading"
        },
        "enrolledAt": "2025-06-10T00:30:00.000Z",
        "progress": {
          "totalSections": 3,
          "completedSections": 2,
          "progressPercentage": 67
        }
      }
    ],
    "badges": [
      {
        "id": "badge_id",
        "name": "AI/ML Fundamentals",
        "description": "Completed all AI/ML League sections",
        "imageUrl": "https://example.com/ai-ml-badge.png",
        "league": {
          "id": "ai_ml_league_id",
          "name": "AI/ML League"
        },
        "earnedAt": "2025-06-10T01:00:00.000Z"
      }
    ],
    "specializations": [
      {
        "id": "spec_id",
        "name": "FinTech Specialization",
        "description": "Combined AI/ML and Finance expertise",
        "completedAt": "2025-06-10T02:00:00.000Z"
      }
    ]
  },
  "message": "User dashboard retrieved successfully"
}
```

---

### 6. Get All Enrollments (Admin View)
Administrative endpoint to view all enrollments with filtering and pagination.

**Endpoint:** `GET /api/progress/enrollments`  
**Access:** Pathfinder+ only  

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)
- `cohortId` (optional): Filter by cohort ID
- `leagueId` (optional): Filter by league ID
- `userId` (optional): Filter by user ID

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
    "enrollments": [
      {
        "id": "enrollment_id",
        "userId": "user_id",
        "cohortId": "cohort_id",
        "leagueId": "league_id",
        "enrolledAt": "2025-06-10T00:15:00.000Z",
        "updatedAt": "2025-06-10T00:15:00.000Z",
        "user": {
          "id": "user_id",
          "name": "John Pioneer",
          "email": "student@openlearn.com",
          "role": "PIONEER"
        },
        "cohort": {
          "id": "cohort_id",
          "name": "Cohort 1"
        },
        "league": {
          "id": "league_id",
          "name": "AI/ML League"
        },
        "progress": {
          "totalSections": 5,
          "completedSections": 3,
          "progressPercentage": 60
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  },
  "message": "Enrollments retrieved successfully"
}
```

---

## Badge System

### Automatic Badge Awarding
- **Trigger**: When a user completes ALL sections in a league
- **Process**: 
  1. System checks if all sections in the league are completed
  2. Looks for existing badge associated with the league
  3. Verifies user doesn't already have the badge
  4. Awards badge and creates audit log
  5. Console logs badge awarding for monitoring

### Badge Requirements
- Each league can have one associated badge
- Badges are only awarded when 100% of league sections are completed
- Users cannot receive the same badge multiple times

---

## Business Logic & Validation

### Enrollment Rules
1. **Active Cohort**: Can only enroll in active cohorts
2. **Active User**: Target user must have ACTIVE status
3. **Unique Enrollment**: One enrollment per user per cohort/league combination
4. **Permission Check**: Only Pathfinder+ can enroll other users
5. **Entity Validation**: Cohort, league, and user must exist

### Progress Tracking Rules
1. **Enrollment Required**: Must be enrolled in league to track progress
2. **Section Ownership**: Can only track progress for sections within enrolled leagues
3. **Completion Immutability**: Completed sections cannot be unmarked as incomplete
4. **Note Privacy**: Personal notes are private to the user
5. **Revision Flags**: Help users identify content for future review

### Permission Matrix
| Role | Self Enroll | Enroll Others | View Own Progress | View Others' Progress | Admin Analytics |
|------|-------------|---------------|-------------------|----------------------|-----------------|
| PIONEER | ✓ | ✗ | ✓ | ✗ | ✗ |
| LUMINARY | ✓ | ✗ | ✓ | ✗ | ✗ |
| PATHFINDER | ✓ | ✓ | ✓ | ✓ | ✓ |
| CHIEF_PATHFINDER | ✓ | ✓ | ✓ | ✓ | ✓ |
| GRAND_PATHFINDER | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Error Handling

### Common Error Responses

**400 Bad Request - Missing Required Fields:**
```json
{
  "success": false,
  "error": "Missing required fields",
  "details": ["cohortId is required", "leagueId is required"]
}
```

**403 Forbidden - Insufficient Permissions:**
```json
{
  "success": false,
  "error": "Insufficient permissions to enroll other users"
}
```

**404 Not Found - Entity Not Found:**
```json
{
  "success": false,
  "error": "League not found"
}
```

**409 Conflict - Duplicate Enrollment:**
```json
{
  "success": false,
  "error": "User is already enrolled in this cohort/league combination"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error while enrolling user"
}
```

---

## Integration Examples

### Frontend Integration - React Examples

**1. Enroll Current User:**
```javascript
const enrollUser = async (cohortId, leagueId) => {
  try {
    const response = await fetch('/api/progress/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ cohortId, leagueId })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Enrolled successfully:', result.data.enrollment);
    }
  } catch (error) {
    console.error('Enrollment failed:', error);
  }
};
```

**2. Mark Section Complete:**
```javascript
const completeSection = async (sectionId, personalNote) => {
  try {
    const response = await fetch(`/api/progress/sections/${sectionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ 
        personalNote,
        markedForRevision: false 
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Section completed:', result.data.progress);
      // Update UI to show completion
    }
  } catch (error) {
    console.error('Failed to complete section:', error);
  }
};
```

**3. Get User Dashboard:**
```javascript
const getUserDashboard = async () => {
  try {
    const response = await fetch('/api/progress/dashboard', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      const { user, statistics, enrollments, badges } = result.data;
      // Update dashboard UI with progress data
      renderDashboard(user, statistics, enrollments, badges);
    }
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
  }
};
```

---

## Testing Examples

### 1. Test User Enrollment
```bash
# Enroll current user in AI/ML League
curl -X POST http://localhost:3001/api/progress/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <student_token>" \
  -d '{
    "cohortId": "cohort_id",
    "leagueId": "ai_ml_league_id"
  }'
```

### 2. Test Section Completion
```bash
# Mark section as completed with personal note
curl -X POST http://localhost:3001/api/progress/sections/section_id/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <student_token>" \
  -d '{
    "personalNote": "Great section on neural networks!",
    "markedForRevision": false
  }'
```

### 3. Test League Progress Tracking
```bash
# Get progress for specific league
curl -X GET http://localhost:3001/api/progress/leagues/ai_ml_league_id \
  -H "Authorization: Bearer <student_token>"
```

### 4. Test Admin Analytics
```bash
# Get all enrollments (admin view)
curl -X GET "http://localhost:3001/api/progress/enrollments?page=1&limit=5" \
  -H "Authorization: Bearer <admin_token>"
```

---

## Next Steps

### Frontend Integration Priorities
1. **Student Dashboard**: Display progress across all enrollments
2. **League Progress View**: Show detailed section-by-section progress
3. **Section Completion UI**: Mark sections complete with notes
4. **Badge Display**: Show earned badges and achievements
5. **Admin Analytics**: Progress monitoring for Pathfinders

### Social Sharing Integration
- **Section Completion**: Twitter sharing (as mentioned in requirements)
- **Week Completion**: LinkedIn sharing (as mentioned in requirements)
- **Badge Earning**: Social media sharing capabilities

### Future Enhancements
- **Specialization Auto-Completion**: Award specializations when all required leagues are completed
- **Progress Analytics**: Advanced reporting and analytics dashboards
- **Learning Paths**: Guided learning progression recommendations
- **Peer Progress**: Compare progress with cohort peers (if privacy allows)

---

*Last updated: June 10, 2025*
