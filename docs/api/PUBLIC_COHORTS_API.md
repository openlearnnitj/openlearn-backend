# Public Cohorts Structure API

## Endpoint: GET /api/public/cohorts-structure

**Purpose**: Frontend developers can fetch the complete learning structure (cohorts → leagues → weeks) in a single optimized request.

### Features
- **Unauthenticated** - No login required
- **Single Request** - Gets everything in one call
- **Optimized Query** - Uses Prisma's nested includes for efficiency
- **Ordered Data** - Cohorts, leagues, and weeks are properly ordered
- **Clean Structure** - Simple, flat JSON structure for easy frontend consumption

### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "cohort-id",
      "name": "Cohort 1.0",
      "description": "First cohort of OpenLearn platform",
      "isActive": true,
      "leagues": [
        {
          "id": "league-id",
          "name": "AI/ML",
          "description": "Artificial Intelligence and Machine Learning track",
          "weeks": [
            {
              "id": "week-id",
              "name": "Week 1: Python Fundamentals",
              "description": "Introduction to Python programming",
              "order": 1
            }
          ]
        }
      ]
    }
  ],
  "message": "Cohorts structure fetched successfully",
  "meta": {
    "timestamp": "2025-07-19T12:16:24.747Z",
    "totalCohorts": 1,
    "totalLeagues": 2,
    "totalWeeks": 5
  }
}
```

### Usage Examples

**JavaScript/React Fetch**
```javascript
const fetchCohortsStructure = async () => {
  try {
    const response = await fetch('/api/public/cohorts-structure');
    const data = await response.json();
    
    if (data.success) {
      console.log('Cohorts:', data.data);
      console.log('Total weeks:', data.meta.totalWeeks);
    }
  } catch (error) {
    console.error('Error fetching cohorts:', error);
  }
};
```

**cURL**
```bash
curl https://api.openlearn.org.in/api/public/cohorts-structure
```

### Error Handling

**Success Response**
- Status: `200 OK`
- `success: true`

**Error Response**
- Status: `500 Internal Server Error`
- `success: false`
- Includes error message and timestamp

### Performance Notes

- Uses optimized Prisma query with nested includes
- Returns only active cohorts
- Data is ordered for consistent frontend display
- Minimal data transfer - only essential fields included
- No authentication overhead

### Frontend Integration

This endpoint is perfect for:
- Building navigation menus
- Course selection pages
- Learning path visualization
- Progress tracking initialization
- Dashboard overviews

The response structure is designed to be directly consumable by frontend frameworks without additional transformation.
