# Social Sharing API Documentation

## Overview
The Social Sharing API provides endpoints for generating social media share links when users complete sections, weeks, or earn achievements (badges/specializations) on the OpenLearn platform. This encourages user engagement and helps promote the platform through organic social sharing.

## Base URL
```
/api/social
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Generate Twitter Share Link for Section Completion

**Endpoint:** `GET /api/social/twitter/section/:sectionId`

**Description:** Generates a Twitter share link when a user completes a section. The user must have completed the section before they can share it.

**Parameters:**
- `sectionId` (URL parameter, required): The ID of the completed section

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://twitter.com/intent/tweet?text=...",
    "shareText": "🚀 Just completed \"Introduction to Programming\" in Web Development league on @OpenLearnPlatform! \n\nMaking progress in my learning journey 📚\n\n#OpenLearn #Learning #WebDevelopment",
    "section": {
      "id": "section_123",
      "name": "Introduction to Programming",
      "league": "Web Development"
    }
  },
  "message": "Twitter share link generated successfully"
}
```

**Error Responses:**
- `404`: Section not found
- `400`: Section not completed by user
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

**Business Logic:**
1. Validates that the section exists
2. Checks that the authenticated user has completed the section
3. Generates personalized share text with section and league information
4. Creates Twitter intent URL with encoded share text
5. Returns the share URL and metadata

**Example Usage:**
```javascript
// Frontend JavaScript example
const response = await fetch('/api/social/twitter/section/section_123', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  // Open Twitter share dialog
  window.open(result.data.shareUrl, '_blank');
}
```

---

### 2. Generate LinkedIn Share Link for Week Completion

**Endpoint:** `GET /api/social/linkedin/week/:weekId`

**Description:** Generates a LinkedIn share link when a user completes all sections in a week. The user must complete all sections in the week before sharing.

**Parameters:**
- `weekId` (URL parameter, required): The ID of the completed week

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://www.linkedin.com/sharing/share-offsite/?url=...",
    "shareText": "🎉 Completed Week 1: Fundamentals in Web Development league on OpenLearn!\n\nLearned so much in this week covering 5 comprehensive sections. Excited to continue my learning journey!\n\n#OpenLearn #ProfessionalDevelopment #WebDevelopment #Learning",
    "week": {
      "id": "week_123",
      "name": "Week 1: Fundamentals",
      "league": "Web Development",
      "completedSections": 5,
      "totalSections": 5
    }
  },
  "message": "LinkedIn share link generated successfully"
}
```

**Error Responses:**
- `404`: Week not found
- `400`: Week not fully completed (all sections must be completed)
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

**Business Logic:**
1. Validates that the week exists
2. Checks that the user has completed ALL sections in the week
3. Counts completed vs total sections for validation
4. Generates professional share text suitable for LinkedIn
5. Creates LinkedIn sharing URL with encoded content
6. Returns share URL with completion statistics

**Example Usage:**
```javascript
// Frontend JavaScript example
const response = await fetch('/api/social/linkedin/week/week_123', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  // Open LinkedIn share dialog
  window.open(result.data.shareUrl, '_blank');
}
```

---

### 3. Generate Achievement Share Link (Badges/Specializations)

**Endpoint:** `GET /api/social/:platform/:type/:id`

**Description:** Generates social media share links for achievements like badges or specializations. Supports both Twitter and LinkedIn platforms.

**Parameters:**
- `platform` (URL parameter, required): Social media platform (`twitter` | `linkedin`)
- `type` (URL parameter, required): Achievement type (`badge` | `specialization`)
- `id` (URL parameter, required): The ID of the badge or specialization

**Success Response (200) - Badge Example:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://twitter.com/intent/tweet?text=...",
    "shareText": "🏆 Just earned the \"JavaScript Master\" badge for completing Web Development league on OpenLearn!\n\nProud of this achievement! 💪\n\n#OpenLearn #Achievement #WebDevelopment",
    "achievement": {
      "type": "badge",
      "title": "JavaScript Master",
      "league": "Web Development"
    },
    "platform": "twitter"
  },
  "message": "twitter share link generated successfully"
}
```

**Success Response (200) - Specialization Example:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://www.linkedin.com/sharing/share-offsite/?url=...",
    "shareText": "🎓 Just completed the \"Full Stack Web Development\" specialization on OpenLearn!\n\nThis comprehensive program has equipped me with valuable skills and knowledge. Ready for the next challenge!\n\n#OpenLearn #Specialization #ProfessionalGrowth",
    "achievement": {
      "type": "specialization",
      "title": "Full Stack Web Development"
    },
    "platform": "linkedin"
  },
  "message": "linkedin share link generated successfully"
}
```

**Error Responses:**
- `400`: Invalid platform (must be `twitter` or `linkedin`)
- `400`: Invalid type (must be `badge` or `specialization`)
- `404`: Achievement not found or not earned by user
- `401`: Unauthorized (invalid/missing token)
- `500`: Internal server error

**Business Logic:**
1. Validates platform and achievement type parameters
2. Queries the appropriate table (UserBadge or UserSpecialization) to verify user has earned the achievement
3. Generates achievement-specific share text
4. Creates platform-specific share URLs
5. Returns formatted response with achievement details

**Example Usage:**
```javascript
// Share a badge on Twitter
const response = await fetch('/api/social/twitter/badge/badge_123', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

// Share a specialization on LinkedIn
const response = await fetch('/api/social/linkedin/specialization/spec_456', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  window.open(result.data.shareUrl, '_blank');
}
```

---

## Data Models

### Section Progress Validation
```typescript
// Checks that user has completed a specific section
const progress = await prisma.sectionProgress.findFirst({
  where: {
    userId: currentUser.userId,
    sectionId: sectionId,
    isCompleted: true
  }
});
```

### Week Completion Validation
```typescript
// Validates all sections in a week are completed
const completedSections = week.sections.filter(
  section => section.progress.length > 0
).length;
const isWeekComplete = completedSections === week.sections.length;
```

### Achievement Verification
```typescript
// For badges
const userBadge = await prisma.userBadge.findFirst({
  where: {
    userId: currentUser.userId,
    badgeId: badgeId
  }
});

// For specializations
const userSpecialization = await prisma.userSpecialization.findFirst({
  where: {
    userId: currentUser.userId,
    specializationId: specializationId
  }
});
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT authentication
2. **User Verification**: Users can only share achievements they have actually earned
3. **Input Validation**: All URL parameters are validated for type and format
4. **SQL Injection Prevention**: Using Prisma ORM with parameterized queries
5. **Rate Limiting**: Consider implementing rate limiting to prevent spam sharing

## Error Handling

All endpoints follow consistent error response format:
```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error scenarios:
- **Authentication Errors**: Missing or invalid JWT tokens
- **Authorization Errors**: Attempting to share unearned achievements
- **Validation Errors**: Invalid parameters or incomplete requirements
- **Not Found Errors**: Requesting non-existent resources

## Social Media Integration Notes

### Twitter Integration
- Uses Twitter Web Intent API for sharing
- Share text is URL-encoded to handle special characters
- Includes OpenLearn mention (@OpenLearnPlatform) for brand visibility
- Uses relevant hashtags for discoverability

### LinkedIn Integration
- Uses LinkedIn sharing API with URL and summary parameters
- More professional tone in share text
- Includes platform URL for traffic generation
- Focuses on professional development aspects

## Frontend Integration Guidelines

### React Component Example
```jsx
import React from 'react';

const ShareButton = ({ type, itemId, platform, children }) => {
  const handleShare = async () => {
    try {
      const endpoint = type === 'section' 
        ? `/api/social/${platform}/section/${itemId}`
        : type === 'week'
        ? `/api/social/${platform}/week/${itemId}`
        : `/api/social/${platform}/${type}/${itemId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        window.open(result.data.shareUrl, '_blank', 'width=600,height=400');
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to generate share link');
    }
  };

  return (
    <button onClick={handleShare} className="share-button">
      {children}
    </button>
  );
};

// Usage examples
<ShareButton type="section" itemId="section_123" platform="twitter">
  Share on Twitter
</ShareButton>

<ShareButton type="week" itemId="week_456" platform="linkedin">
  Share on LinkedIn
</ShareButton>

<ShareButton type="badge" itemId="badge_789" platform="twitter">
  Share Badge
</ShareButton>
```

### Share Text Customization
The API generates platform-appropriate share text, but you can customize it by:
1. Modifying the share text templates in the controller
2. Adding user-specific customization options
3. Including additional achievement details
4. Incorporating gamification elements (streaks, points, etc.)

## Testing Examples

### Postman/Insomnia Testing

**Test Section Share:**
```
GET /api/social/twitter/section/64a7b8c9d0e1f2a3b4c5d6e7
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Test Week Share:**
```
GET /api/social/linkedin/week/64a7b8c9d0e1f2a3b4c5d6e8
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Test Badge Share:**
```
GET /api/social/twitter/badge/64a7b8c9d0e1f2a3b4c5d6e9
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Testing Examples

```bash
# Test Twitter section share
curl -X GET "http://localhost:3000/api/social/twitter/section/section_123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test LinkedIn week share
curl -X GET "http://localhost:3000/api/social/linkedin/week/week_456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test achievement share
curl -X GET "http://localhost:3000/api/social/twitter/badge/badge_789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

