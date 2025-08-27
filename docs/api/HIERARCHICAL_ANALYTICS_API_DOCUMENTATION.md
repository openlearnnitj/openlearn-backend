# Hierarchical Analytics API Documentation

## Overview

The Hierarchical Analytics API provides comprehensive count and completion statistics for the OpenLearn platform's learning hierarchy:

**Hierarchy Structure:** League → Week → Section → Resource

This endpoint allows frontend applications to efficiently retrieve aggregated data for dashboards, progress tracking, and analytics visualizations.

## Base URL

```
https://api.openlearn.org.in
```

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### GET /api/analytics/counts

Retrieve hierarchical count analytics with completion statistics for all hierarchy levels.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Specific user ID for analytics. Defaults to current authenticated user |
| `leagueId` | string | No | Get detailed breakdown for specific league |
| `weekId` | string | No | Get detailed breakdown for specific week |
| `sectionId` | string | No | Get detailed breakdown for specific section |

#### Response Format

```json
{
  "success": true,
  "data": {
    "userId": "user_id_here",
    "timestamp": "2025-07-11T10:30:00.000Z",
    "global": {
      "totals": {
        "leagues": 5,
        "weeks": 25,
        "sections": 150,
        "resources": 750
      },
      "completed": {
        "sections": 45,
        "resources": 220
      },
      "completionPercentages": {
        "sections": 30,
        "resources": 29
      }
    }
  },
  "message": "Hierarchical count analytics retrieved successfully"
}
```

#### Detailed League Breakdown

When `leagueId` parameter is provided, additional league details are included:

```json
{
  "success": true,
  "data": {
    "userId": "user_id_here",
    "timestamp": "2025-07-11T10:30:00.000Z",
    "global": { /* ... global data ... */ },
    "league": {
      "leagueId": "league_123",
      "leagueName": "Web Development Fundamentals",
      "description": "Learn the basics of web development",
      "totals": {
        "weeks": 4,
        "sections": 16,
        "resources": 80
      },
      "completed": {
        "weeks": 2,
        "sections": 8,
        "resources": 40
      },
      "completionPercentages": {
        "weeks": 50,
        "sections": 50,
        "resources": 50
      },
      "weeks": [
        {
          "weekId": "week_123",
          "weekName": "Introduction to HTML",
          "order": 1,
          "totalSections": 4,
          "completedSections": 4,
          "totalResources": 20,
          "completedResources": 20,
          "isCompleted": true,
          "completionPercentage": {
            "sections": 100,
            "resources": 100
          },
          "sections": [
            {
              "sectionId": "section_123",
              "sectionName": "HTML Basics",
              "order": 1,
              "totalResources": 5,
              "completedResources": 5,
              "isCompleted": true,
              "completionPercentage": 100,
              "resources": [
                {
                  "resourceId": "resource_123",
                  "title": "Introduction to HTML Tags",
                  "type": "VIDEO",
                  "order": 1,
                  "isCompleted": true
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

#### Week-Specific Data

When `weekId` parameter is provided:

```json
{
  "success": true,
  "data": {
    "userId": "user_id_here",
    "global": { /* ... global data ... */ },
    "week": {
      "weekId": "week_123",
      "weekName": "Introduction to HTML",
      "order": 1,
      "league": {
        "id": "league_123",
        "name": "Web Development Fundamentals"
      },
      "totals": {
        "sections": 4,
        "resources": 20
      },
      "completed": {
        "sections": 4,
        "resources": 20
      },
      "completionPercentages": {
        "sections": 100,
        "resources": 100
      }
    }
  }
}
```

#### Section-Specific Data

When `sectionId` parameter is provided:

```json
{
  "success": true,
  "data": {
    "userId": "user_id_here",
    "global": { /* ... global data ... */ },
    "section": {
      "sectionId": "section_123",
      "sectionName": "HTML Basics",
      "order": 1,
      "week": {
        "weekId": "week_123",
        "weekName": "Introduction to HTML",
        "league": {
          "id": "league_123",
          "name": "Web Development Fundamentals"
        }
      },
      "totals": {
        "resources": 5
      },
      "completed": {
        "resources": 5
      },
      "completionPercentages": {
        "resources": 100
      },
      "isCompleted": true,
      "resources": [
        {
          "resourceId": "resource_123",
          "title": "Introduction to HTML Tags",
          "type": "VIDEO",
          "order": 1,
          "isCompleted": true
        }
      ]
    }
  }
}
```

## Usage Examples

### Frontend React Integration

```javascript
// Basic global analytics
const fetchGlobalAnalytics = async () => {
  try {
    const response = await fetch('/api/analytics/counts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { global } = data.data;
      console.log('Global completion rates:', global.completionPercentages);
    }
  } catch (error) {
    console.error('Analytics fetch error:', error);
  }
};

// Detailed league breakdown
const fetchLeagueDetails = async (leagueId) => {
  try {
    const response = await fetch(`/api/analytics/counts?leagueId=${leagueId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.league) {
      const league = data.data.league;
      console.log(`League "${league.leagueName}" progress:`, league.completionPercentages);
    }
  } catch (error) {
    console.error('League analytics fetch error:', error);
  }
};

// User-specific analytics
const fetchUserAnalytics = async (userId) => {
  try {
    const response = await fetch(`/api/analytics/counts?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`User ${data.data.userId} progress:`, data.data.global.completionPercentages);
    }
  } catch (error) {
    console.error('User analytics fetch error:', error);
  }
};
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Not Found",
  "message": "League/Week/Section not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to retrieve hierarchical analytics"
}
```

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 10 requests per 15 minutes per IP
- **Admin endpoints**: 50 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Performance Considerations

- The endpoint uses efficient database queries with proper indexing
- Large datasets are paginated automatically
- Caching is implemented for frequently accessed data
- Response times typically under 200ms for standard queries

## Data Integrity

- All counts are calculated in real-time from the database
- Completion percentages are rounded to whole numbers
- Progress data is consistent across all hierarchy levels
- Missing or invalid IDs return appropriate error responses

## Security

- All endpoints require valid JWT authentication
- Users can only access their own progress data (unless they have elevated permissions)
- Input validation prevents SQL injection attacks
- Rate limiting prevents abuse

## Changelog

### Version 1.0 (July 2025)
- Initial implementation of hierarchical analytics endpoint
- Support for global, league, week, and section-level analytics
- Real-time completion tracking
- Comprehensive error handling
