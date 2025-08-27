# Badge Management API Documentation

## Overview

The Badge Management System provides comprehensive functionality for creating, awarding, and managing badges within the OpenLearn platform. It includes both automatic badge awarding (when users complete all sections in a league) and manual badge management capabilities for administrators.

## Badge System Features

### ✅ **Automatic Badge Awarding**
- Badges are automatically awarded when users complete **all sections** in a league
- System checks for league completion after each section completion
- Prevents duplicate badge awards
- Creates audit logs for all automatic awards

### 🛠️ **Manual Badge Management**
- Create custom badges for leagues
- Manually award badges to users (with optional reason)
- Revoke badges from users (with optional reason)
- Update badge details (name, description, image)
- Delete unused badges
- View badge analytics and statistics

### 🔐 **Role-Based Permissions**
- **All Users**: View badges, view own earned badges
- **Pathfinder+**: Manually award badges to users
- **Chief Pathfinder+**: Create, update, revoke badges, view analytics
- **Grand Pathfinder**: Delete badges (only if not awarded to any users)

---

## API Endpoints

### 1. Get All Badges

**Endpoint:** `GET /api/badges`  
**Access:** All authenticated users  
**Description:** Retrieve all badges in the system with user's earned status

**Query Parameters:**
- None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "badge_id_1",
        "name": "AI/ML Fundamentals Badge",
        "description": "Awarded for completing all AI/ML League sections",
        "imageUrl": "https://example.com/badge.png",
        "league": {
          "id": "league_id",
          "name": "AI/ML League",
          "description": "Learn machine learning fundamentals"
        },
        "earnedByUser": true,
        "earnedAt": "2025-06-10T15:00:00.000Z",
        "totalEarners": 25,
        "createdAt": "2025-06-01T10:00:00.000Z"
      },
      {
        "id": "badge_id_2",
        "name": "Web Development Master",
        "description": "Completed all web development challenges",
        "imageUrl": "https://example.com/web-badge.png",
        "league": {
          "id": "league_id_2",
          "name": "Web Development League",
          "description": "Full-stack web development"
        },
        "earnedByUser": false,
        "earnedAt": null,
        "totalEarners": 18,
        "createdAt": "2025-06-01T10:00:00.000Z"
      }
    ],
    "total": 2,
    "earnedCount": 1
  },
  "message": "Badges retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

---

### 2. Get My Badges

**Endpoint:** `GET /api/badges/my-badges`  
**Access:** All authenticated users  
**Description:** Retrieve current user's earned badges

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "badge_id_1",
        "name": "AI/ML Fundamentals Badge",
        "description": "Awarded for completing all AI/ML League sections",
        "imageUrl": "https://example.com/badge.png",
        "league": {
          "id": "league_id",
          "name": "AI/ML League",
          "description": "Learn machine learning fundamentals"
        },
        "earnedAt": "2025-06-10T15:00:00.000Z"
      }
    ],
    "total": 1
  },
  "message": "User badges retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

---

### 3. Create Badge

**Endpoint:** `POST /api/badges`  
**Access:** Chief Pathfinder, Grand Pathfinder  
**Description:** Create a new badge for a league

**Request Body:**
```json
{
  "name": "Python Mastery Badge",
  "description": "Awarded for completing all Python programming sections",
  "imageUrl": "https://example.com/python-badge.png",
  "leagueId": "league_id_123"
}
```

**Required Fields:**
- `name` (string): Badge name
- `leagueId` (string): ID of the league this badge is for

**Optional Fields:**
- `description` (string): Badge description
- `imageUrl` (string): URL to badge image

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "badge": {
      "id": "new_badge_id",
      "name": "Python Mastery Badge",
      "description": "Awarded for completing all Python programming sections",
      "imageUrl": "https://example.com/python-badge.png",
      "league": {
        "id": "league_id_123",
        "name": "Python Programming League",
        "description": "Learn Python from basics to advanced"
      },
      "createdAt": "2025-06-10T16:00:00.000Z"
    }
  },
  "message": "Badge created successfully"
}
```

**Error Responses:**
- `400`: Missing required fields (name, leagueId)
- `400`: Badge already exists for this league
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: League not found
- `500`: Internal server error

---

### 4. Update Badge

**Endpoint:** `PUT /api/badges/:id`  
**Access:** Chief Pathfinder, Grand Pathfinder  
**Description:** Update badge details

**URL Parameters:**
- `id` (string, required): Badge ID

**Request Body:**
```json
{
  "name": "Updated Badge Name",
  "description": "Updated description",
  "imageUrl": "https://example.com/updated-badge.png"
}
```

**Optional Fields:**
- `name` (string): Updated badge name
- `description` (string): Updated badge description
- `imageUrl` (string): Updated badge image URL

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "badge": {
      "id": "badge_id",
      "name": "Updated Badge Name",
      "description": "Updated description",
      "imageUrl": "https://example.com/updated-badge.png",
      "league": {
        "id": "league_id",
        "name": "League Name",
        "description": "League description"
      },
      "updatedAt": "2025-06-10T16:30:00.000Z"
    }
  },
  "message": "Badge updated successfully"
}
```

**Error Responses:**
- `400`: No fields provided to update
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Badge not found
- `500`: Internal server error

---

### 5. Award Badge Manually

**Endpoint:** `POST /api/badges/:id/award`  
**Access:** Pathfinder, Chief Pathfinder, Grand Pathfinder  
**Description:** Manually award a badge to a user

**URL Parameters:**
- `id` (string, required): Badge ID

**Request Body:**
```json
{
  "userId": "user_id_123",
  "reason": "Exceptional performance and dedication"
}
```

**Required Fields:**
- `userId` (string): ID of user to award badge to

**Optional Fields:**
- `reason` (string): Reason for manual badge award

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "userBadge": {
      "id": "user_badge_id",
      "badge": {
        "id": "badge_id",
        "name": "AI/ML Fundamentals Badge",
        "description": "Awarded for completing all AI/ML sections",
        "league": {
          "id": "league_id",
          "name": "AI/ML League"
        }
      },
      "user": {
        "id": "user_id_123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "earnedAt": "2025-06-10T17:00:00.000Z"
    }
  },
  "message": "Badge awarded successfully"
}
```

**Error Responses:**
- `400`: Missing userId
- `400`: User already has this badge
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Badge not found
- `404`: Target user not found
- `500`: Internal server error

---

### 6. Revoke Badge

**Endpoint:** `DELETE /api/badges/:id/revoke`  
**Access:** Chief Pathfinder, Grand Pathfinder  
**Description:** Revoke a badge from a user

**URL Parameters:**
- `id` (string, required): Badge ID

**Request Body:**
```json
{
  "userId": "user_id_123",
  "reason": "Badge awarded in error"
}
```

**Required Fields:**
- `userId` (string): ID of user to revoke badge from

**Optional Fields:**
- `reason` (string): Reason for badge revocation

**Success Response (200):**
```json
{
  "success": true,
  "message": "Badge revoked successfully"
}
```

**Error Responses:**
- `400`: Missing userId
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: User does not have this badge
- `500`: Internal server error

---

### 7. Get Badge Analytics

**Endpoint:** `GET /api/badges/analytics`  
**Access:** Chief Pathfinder, Grand Pathfinder  
**Description:** Retrieve badge analytics and statistics

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalBadges": 15,
      "totalAwarded": 245,
      "uniqueEarners": 78,
      "averageBadgesPerUser": "3.14"
    },
    "badgePopularity": [
      {
        "id": "badge_id_1",
        "name": "Web Development Master",
        "league": "Web Development League",
        "timesEarned": 45
      },
      {
        "id": "badge_id_2",
        "name": "AI/ML Fundamentals",
        "league": "AI/ML League",
        "timesEarned": 38
      }
    ],
    "recentAwards": [
      {
        "id": "user_badge_id",
        "badge": {
          "name": "Python Mastery",
          "league": "Python League"
        },
        "user": {
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "earnedAt": "2025-06-10T16:45:00.000Z"
      }
    ]
  },
  "message": "Badge analytics retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal server error

---

### 8. Delete Badge

**Endpoint:** `DELETE /api/badges/:id`  
**Access:** Grand Pathfinder only  
**Description:** Delete a badge (only if no users have earned it)

**URL Parameters:**
- `id` (string, required): Badge ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Badge deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete badge - it has been awarded to users
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Badge not found
- `500`: Internal server error

---

## Badge Workflow Examples

### Frontend Integration Examples

#### 1. Display All Badges (React Component)
```javascript
// Get all badges with user's earned status
const fetchBadges = async () => {
  try {
    const response = await fetch('/api/badges', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setBadges(data.data.badges);
      setEarnedCount(data.data.earnedCount);
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
  }
};
```

#### 2. Award Badge to User (Admin Component)
```javascript
// Manually award badge to a user
const awardBadge = async (badgeId, userId, reason) => {
  try {
    const response = await fetch(`/api/badges/${badgeId}/award`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        reason: reason
      })
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('Badge awarded successfully!');
      refreshBadgeData();
    } else {
      toast.error(data.error);
    }
  } catch (error) {
    console.error('Error awarding badge:', error);
    toast.error('Failed to award badge');
  }
};
```

#### 3. Create New Badge (Admin Form)
```javascript
// Create a new badge for a league
const createBadge = async (badgeData) => {
  try {
    const response = await fetch('/api/badges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: badgeData.name,
        description: badgeData.description,
        imageUrl: badgeData.imageUrl,
        leagueId: badgeData.leagueId
      })
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('Badge created successfully!');
      navigate('/admin/badges');
    } else {
      toast.error(data.error);
    }
  } catch (error) {
    console.error('Error creating badge:', error);
    toast.error('Failed to create badge');
  }
};
```

## Business Logic

### Automatic Badge Awarding
1. **Trigger**: After each section completion
2. **Check**: Calculate if all sections in the league are completed
3. **Verification**: Ensure badge exists for the league
4. **Prevention**: Check if user already has the badge
5. **Award**: Create UserBadge record and audit log
6. **Notification**: Console log for monitoring

### Manual Badge Management
1. **Role Verification**: Check user permissions before operations
2. **Data Validation**: Validate all required fields and relationships
3. **Duplicate Prevention**: Prevent duplicate badges per league/user
4. **Audit Logging**: Log all manual badge operations
5. **Cascade Protection**: Prevent deletion of awarded badges

### Badge Analytics
- **Overview Statistics**: Total badges, awards, unique earners
- **Popularity Rankings**: Most earned badges across platform
- **Recent Activity**: Latest badge awards for monitoring
- **Performance Metrics**: Average badges per user

---

## Integration Notes

### Social Sharing Integration
- Badges can be shared on social media using existing social endpoints
- Use `/api/social/twitter/badge/:badgeId` for Twitter sharing
- Use `/api/social/linkedin/badge/:badgeId` for LinkedIn sharing

### Progress Tracking Integration
- Badge status is included in league progress responses
- Dashboard endpoint includes user's earned badges
- Section completion automatically triggers badge checking

### Audit System Integration
- All badge operations are logged in the audit system
- Manual badge operations include the admin who performed the action
- Automatic badge awards include completion statistics
