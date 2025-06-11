# Leaderboard API Documentation

## Overview
The Leaderboard API provides endpoints to view user rankings based on resource completion, track individual user progress, and filter leaderboards by various criteria. All endpoints require user authentication.

## Base URL
```
/api/leaderboard
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get Resource Completion Leaderboard

Get the top 10 users ranked by the number of resources they have completed.

**Endpoint:** `GET /api/leaderboard`

**Authentication:** Required (any authenticated user)

**Response:**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "id": "clm123abc",
          "name": "John Doe",
          "email": "john@example.com",
          "role": "PIONEER",
          "twitterHandle": "johndoe",
          "linkedinUrl": "https://linkedin.com/in/johndoe",
          "githubUsername": "johndoe",
          "kaggleUsername": "johndoe"
        },
        "stats": {
          "resourcesCompleted": 45,
          "totalResources": 50,
          "completionPercentage": 90,
          "badgesEarned": 8,
          "enrolledCohorts": 2
        },
        "recentActivity": {
          "lastCompletedResource": {
            "name": "Advanced Neural Networks",
            "completedAt": "2025-06-10T14:30:00.000Z"
          },
          "lastBadgeEarned": {
            "name": "AI Pioneer",
            "earnedAt": "2025-06-09T12:00:00.000Z"
          }
        }
      }
      // ... 9 more users
    ],
    "totalUsers": 10,
    "lastUpdated": "2025-06-11T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/leaderboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 2. Get Current User's Rank

Get the authenticated user's current position in the leaderboard along with nearby users.

**Endpoint:** `GET /api/leaderboard/my-rank`

**Authentication:** Required (authenticated user)

**Response:**
```json
{
  "success": true,
  "message": "User rank retrieved successfully",
  "data": {
    "rank": 15,
    "user": {
      "id": "clm456def",
      "name": "Current User",
      "email": "user@example.com",
      "role": "PIONEER",
      "githubUsername": "currentuser"
    },
    "stats": {
      "resourcesCompleted": 25,
      "totalResources": 35,
      "completionPercentage": 71,
      "badgesEarned": 4,
      "enrolledCohorts": 1
    },
    "recentActivity": {
      "lastCompletedResource": {
        "name": "Introduction to Machine Learning",
        "completedAt": "2025-06-08T16:45:00.000Z"
      },
      "lastBadgeEarned": {
        "name": "First Steps",
        "earnedAt": "2025-06-01T10:30:00.000Z"
      }
    },
    "isCurrentUser": true,
    "nearbyUsers": {
      "above": {
        "rank": 14,
        "user": {
          "id": "clm789ghi",
          "name": "Above User",
          "email": "above@example.com"
        },
        "stats": {
          "resourcesCompleted": 26,
          "totalResources": 35,
          "completionPercentage": 74
        }
      },
      "below": {
        "rank": 16,
        "user": {
          "id": "clm012jkl",
          "name": "Below User",
          "email": "below@example.com"
        },
        "stats": {
          "resourcesCompleted": 24,
          "totalResources": 40,
          "completionPercentage": 60
        }
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/leaderboard/my-rank \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 3. Get Filtered Leaderboard

Get a leaderboard with optional filters for specialization, league, and custom limit.

**Endpoint:** `GET /api/leaderboard/filtered`

**Authentication:** Required (any authenticated user)

**Query Parameters:**
- `specialization` (optional): Filter by specialization ID
- `league` (optional): Filter by league ID  
- `limit` (optional): Number of users to return (max 50, default 10)

**Response:**
```json
{
  "success": true,
  "message": "Filtered leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "id": "clm123abc",
          "name": "Top AI Student",
          "email": "topai@example.com",
          "role": "PIONEER"
        },
        "stats": {
          "resourcesCompleted": 35,
          "totalResources": 40,
          "completionPercentage": 87,
          "badgesEarned": 6,
          "enrolledCohorts": 1
        },
        "recentActivity": {
          "lastCompletedResource": {
            "name": "Deep Learning Fundamentals",
            "completedAt": "2025-06-10T18:20:00.000Z"
          }
        }
      }
      // ... more users based on filters
    ],
    "filters": {
      "specialization": "clm123spec",
      "league": "clm456league",
      "limit": 20
    },
    "totalUsers": 18,
    "lastUpdated": "2025-06-11T10:30:00.000Z"
  }
}
```

**cURL Examples:**

Get AI specialization leaderboard:
```bash
curl -X GET "http://localhost:3000/api/leaderboard/filtered?specialization=clm123spec&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Get beginner league leaderboard:
```bash
curl -X GET "http://localhost:3000/api/leaderboard/filtered?league=clm456league&limit=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Get combined filters:
```bash
curl -X GET "http://localhost:3000/api/leaderboard/filtered?specialization=clm123spec&league=clm456league&limit=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Error Responses

### Authentication Error (401)
```json
{
  "success": false,
  "error": "Access token is required"
}
```

### User Not Found (404)
```json
{
  "success": false,
  "error": "User not found in leaderboard"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Failed to fetch leaderboard",
  "details": "Database connection error" // Only in development
}
```

---

## Data Models

### LeaderboardUser
```typescript
interface LeaderboardUser {
  rank: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    twitterHandle?: string;
    linkedinUrl?: string;
    githubUsername?: string;
    kaggleUsername?: string;
  };
  stats: {
    resourcesCompleted: number;
    totalResources: number;
    completionPercentage: number;
    badgesEarned: number;
    enrolledCohorts: number;
  };
  recentActivity: {
    lastCompletedResource?: {
      name: string;
      completedAt: Date;
    };
    lastBadgeEarned?: {
      name: string;
      earnedAt: Date;
    };
  };
}
```

## Ranking Algorithm

The leaderboard uses a multi-tier ranking system:

1. **Primary:** Number of resources completed (descending)
2. **Secondary:** Completion percentage (descending)  
3. **Tertiary:** Number of badges earned (descending)

This ensures that users who complete more resources rank higher, but among users with the same completion count, those with higher completion rates are ranked better.

## Rate Limiting

The leaderboard endpoints are subject to standard rate limiting:
- 100 requests per 15 minutes per user
- Filtered leaderboard has a maximum limit of 50 users per request

## Usage Examples

### Frontend Integration (React/JavaScript)

```javascript
// Get leaderboard
const getLeaderboard = async () => {
  try {
    const response = await fetch('/api/leaderboard', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setLeaderboard(data.data.leaderboard);
    }
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }
};

// Get user's rank
const getMyRank = async () => {
  try {
    const response = await fetch('/api/leaderboard/my-rank', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setUserRank(data.data);
    }
  } catch (error) {
    console.error('Failed to fetch user rank:', error);
  }
};
```

## Performance Considerations

- Leaderboard data is computed in real-time from the database
- For high-traffic applications, consider implementing caching with Redis
- The filtered leaderboard supports efficient queries with proper database indexing
- Maximum limit of 50 users per request to prevent performance issues

## Security

- All endpoints require valid JWT authentication
- User email addresses are included in responses (consider privacy implications)
- No sensitive data like passwords or tokens are exposed
- Rate limiting prevents abuse of the leaderboard endpoints
