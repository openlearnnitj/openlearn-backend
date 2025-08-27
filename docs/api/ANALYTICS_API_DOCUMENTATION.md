# OpenLearn Analytics & Reporting API Documentation

## Overview
The Analytics system provides comprehensive reporting and statistics for the OpenLearn platform, including platform-wide metrics, cohort performance analytics, and individual user reports.

## Base URL
```
http://localhost:3001/api/analytics
```

## Authentication
All analytics endpoints require authentication via JWT token:
```json
{
  "Authorization": "Bearer <access_token>"
}
```

## Role-Based Access Control
- **Platform Analytics**: Pathfinder+ only
- **Cohort Analytics**: Pathfinder+ only  
- **User Reports**: All users (own report) or Pathfinder+ (any user)

---

## Analytics Endpoints

### 1. Platform Overview Statistics
Get comprehensive platform-wide statistics.

**Endpoint:** `GET /api/analytics/platform`  
**Access:** Pathfinder+

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 125,
      "pending": 15,
      "suspended": 10
    },
    "learning": {
      "totalEnrollments": 300,
      "totalCohorts": 2,
      "totalLeagues": 4,
      "totalSections": 120,
      "completedSections": 850,
      "overallCompletionRate": 71
    },
    "achievements": {
      "totalBadgesEarned": 45,
      "totalSpecializationsCompleted": 12
    }
  },
  "message": "Platform statistics retrieved successfully"
}
```

### 2. Cohort Performance Analytics
Get detailed analytics for a specific cohort.

**Endpoint:** `GET /api/analytics/cohort/:cohortId`  
**Access:** Pathfinder+

**Response:**
```json
{
  "success": true,
  "data": {
    "cohort": {
      "id": "cohort_id",
      "name": "Cohort 1",
      "description": "First batch of OpenLearn students",
      "isActive": true
    },
    "analytics": {
      "totalEnrollments": 75,
      "totalSpecializations": 2,
      "leagueProgress": [
        {
          "userId": "user_id",
          "userName": "John Pioneer",
          "userEmail": "student@openlearn.com",
          "league": {
            "id": "league_id",
            "name": "AI/ML"
          },
          "totalSections": 30,
          "completedSections": 25,
          "progressPercentage": 83
        }
      ]
    }
  },
  "message": "Cohort analytics retrieved successfully"
}
```

### 3. User Performance Report
Get comprehensive performance report for a user.

**Endpoint:** `GET /api/analytics/user/:userId`  
**Access:** All users (own report) or Pathfinder+ (any user)

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
      "status": "ACTIVE",
      "createdAt": "2025-06-01T10:00:00.000Z"
    },
    "summary": {
      "totalEnrollments": 2,
      "badgesEarned": 1,
      "specializationsCompleted": 0,
      "averageProgress": 75
    },
    "progressData": [
      {
        "enrollment": {
          "cohort": { "id": "cohort_id", "name": "Cohort 1" },
          "league": { "id": "league_id", "name": "AI/ML" }
        },
        "totalSections": 30,
        "completedSections": 25,
        "progressPercentage": 83
      }
    ]
  },
  "message": "User report retrieved successfully"
}
```

---

## Testing Examples

### Get Platform Statistics
```bash
curl -X GET http://localhost:3001/api/analytics/platform \
  -H "Authorization: Bearer <admin_token>"
```

### Get Cohort Analytics
```bash
curl -X GET http://localhost:3001/api/analytics/cohort/cohort_id \
  -H "Authorization: Bearer <admin_token>"
```

### Get User Report
```bash
# Get own report
curl -X GET http://localhost:3001/api/analytics/user/user_id \
  -H "Authorization: Bearer <user_token>"

# Admin viewing any user's report
curl -X GET http://localhost:3001/api/analytics/user/target_user_id \
  -H "Authorization: Bearer <admin_token>"
```

---

*Last updated: June 10, 2025*
