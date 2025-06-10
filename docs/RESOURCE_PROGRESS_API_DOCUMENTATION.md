# Resource Progress Tracking API Documentation

## Overview
The Resource Progress Tracking API enables users to interact with individual learning resources at a granular level. Users can mark resources as completed, add personal notes, mark resources for revision, and track time spent on each resource.

## Base URL
```
http://localhost:3000/api/resource-progress
```

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <access_token>
```

---

## 📚 **RESOURCE PROGRESS ENDPOINTS**

### 1. Get Resource Progress
**Endpoint:** `GET /api/resource-progress/:resourceId`  
**Access:** All authenticated users  
**Description:** Get user's progress for a specific resource

**Response:**
```json
{
  "success": true,
  "data": {
    "resource": {
      "id": "resource_id",
      "title": "Introduction to Machine Learning",
      "url": "https://example.com/ml-intro",
      "type": "VIDEO",
      "order": 1,
      "section": {
        "id": "section_id",
        "name": "ML Fundamentals",
        "week": {
          "id": "week_id",
          "name": "Week 1",
          "league": {
            "id": "league_id",
            "name": "AI/ML"
          }
        }
      }
    },
    "progress": {
      "id": "progress_id",
      "isCompleted": false,
      "completedAt": null,
      "personalNote": null,
      "markedForRevision": false,
      "timeSpent": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 2. Mark Resource as Completed
**Endpoint:** `POST /api/resource-progress/:resourceId/complete`  
**Access:** All authenticated users  
**Description:** Mark a resource as completed with optional time tracking and notes

**Request Body:**
```json
{
  "timeSpent": 3600,
  "personalNote": "Great introduction to ML concepts. Need to practice the examples shown."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress_id",
    "userId": "user_id",
    "resourceId": "resource_id",
    "isCompleted": true,
    "completedAt": "2024-01-15T11:30:00Z",
    "personalNote": "Great introduction to ML concepts. Need to practice the examples shown.",
    "markedForRevision": false,
    "timeSpent": 3600,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:30:00Z"
  },
  "message": "Resource \"Introduction to Machine Learning\" marked as completed!"
}
```

### 3. Mark Resource for Revision
**Endpoint:** `POST /api/resource-progress/:resourceId/revision`  
**Access:** All authenticated users  
**Description:** Mark a resource for revision with optional notes

**Request Body:**
```json
{
  "personalNote": "Need to review the supervised learning section again. Concepts were unclear."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress_id",
    "userId": "user_id",
    "resourceId": "resource_id",
    "isCompleted": false,
    "completedAt": null,
    "personalNote": "Need to review the supervised learning section again. Concepts were unclear.",
    "markedForRevision": true,
    "timeSpent": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "Resource \"Introduction to Machine Learning\" marked for revision!"
}
```

### 4. Update Resource Note
**Endpoint:** `PUT /api/resource-progress/:resourceId/note`  
**Access:** All authenticated users  
**Description:** Update personal note for a resource

**Request Body:**
```json
{
  "personalNote": "Updated note: Excellent video, covered gradient descent very well. Bookmark for future reference."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress_id",
    "userId": "user_id",
    "resourceId": "resource_id",
    "isCompleted": true,
    "completedAt": "2024-01-15T11:30:00Z",
    "personalNote": "Updated note: Excellent video, covered gradient descent very well. Bookmark for future reference.",
    "markedForRevision": false,
    "timeSpent": 3600,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T12:30:00Z"
  },
  "message": "Personal note updated successfully!"
}
```

### 5. Reset Resource Progress
**Endpoint:** `DELETE /api/resource-progress/:resourceId/reset`  
**Access:** All authenticated users  
**Description:** Reset resource progress (unmark as completed/revision)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "progress_id",
    "userId": "user_id",
    "resourceId": "resource_id",
    "isCompleted": false,
    "completedAt": null,
    "personalNote": "Updated note: Excellent video, covered gradient descent very well. Bookmark for future reference.",
    "markedForRevision": false,
    "timeSpent": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T13:00:00Z"
  },
  "message": "Resource progress reset successfully!"
}
```

### 6. Get Section Resources with Progress
**Endpoint:** `GET /api/resource-progress/section/:sectionId/resources`  
**Access:** All authenticated users  
**Description:** Get all resources in a section with user's progress

**Response:**
```json
{
  "success": true,
  "data": {
    "section": {
      "id": "section_id",
      "name": "ML Fundamentals",
      "description": "Basic concepts of machine learning",
      "order": 1,
      "week": {
        "id": "week_id",
        "name": "Week 1",
        "league": {
          "id": "league_id",
          "name": "AI/ML"
        }
      }
    },
    "resources": [
      {
        "id": "resource_1",
        "title": "Introduction to Machine Learning",
        "url": "https://example.com/ml-intro",
        "type": "VIDEO",
        "order": 1,
        "progress": {
          "isCompleted": true,
          "completedAt": "2024-01-15T11:30:00Z",
          "personalNote": "Great introduction",
          "markedForRevision": false,
          "timeSpent": 3600
        }
      },
      {
        "id": "resource_2",
        "title": "ML Types Overview",
        "url": "https://example.com/ml-types",
        "type": "ARTICLE",
        "order": 2,
        "progress": {
          "isCompleted": false,
          "completedAt": null,
          "personalNote": null,
          "markedForRevision": true,
          "timeSpent": null
        }
      }
    ],
    "statistics": {
      "totalResources": 2,
      "completedResources": 1,
      "markedForRevision": 1,
      "completionPercentage": 50,
      "totalTimeSpent": 3600
    }
  }
}
```

### 7. Get Resources Marked for Revision
**Endpoint:** `GET /api/resource-progress/revision/list`  
**Access:** All authenticated users  
**Description:** Get user's resources marked for revision with pagination

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "revisionResources": [
      {
        "progress": {
          "id": "progress_id",
          "personalNote": "Need to review this section again",
          "markedForRevision": true,
          "isCompleted": false,
          "completedAt": null,
          "timeSpent": 1800,
          "updatedAt": "2024-01-15T12:00:00Z"
        },
        "resource": {
          "id": "resource_id",
          "title": "Advanced Neural Networks",
          "url": "https://example.com/neural-networks",
          "type": "VIDEO",
          "order": 3,
          "section": {
            "id": "section_id",
            "name": "Deep Learning",
            "week": {
              "id": "week_id",
              "name": "Week 3",
              "league": {
                "id": "league_id",
                "name": "AI/ML"
              }
            }
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

## 🎯 **FRONTEND INTEGRATION EXAMPLES**

### Complete Resource Component
```javascript
const ResourceCard = ({ resource }) => {
  const [progress, setProgress] = useState(resource.progress);
  const [timeSpent, setTimeSpent] = useState(0);
  const [note, setNote] = useState(progress?.personalNote || '');
  const [startTime, setStartTime] = useState(null);

  // Start tracking time when resource is opened
  const handleResourceOpen = () => {
    setStartTime(Date.now());
    window.open(resource.url, '_blank');
  };

  // Mark resource as completed
  const markCompleted = async () => {
    const totalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    try {
      const response = await fetch(`/api/resource-progress/${resource.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          timeSpent: timeSpent + totalTime,
          personalNote: note
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setProgress(result.data);
        showSuccess('Resource marked as completed!');
      }
    } catch (error) {
      showError('Failed to mark resource as completed');
    }
  };

  // Mark for revision
  const markForRevision = async () => {
    try {
      const response = await fetch(`/api/resource-progress/${resource.id}/revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          personalNote: note
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setProgress(result.data);
        showSuccess('Resource marked for revision!');
      }
    } catch (error) {
      showError('Failed to mark resource for revision');
    }
  };

  // Update note
  const updateNote = async () => {
    try {
      const response = await fetch(`/api/resource-progress/${resource.id}/note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          personalNote: note
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setProgress(result.data);
        showSuccess('Note updated successfully!');
      }
    } catch (error) {
      showError('Failed to update note');
    }
  };

  return (
    <div className="resource-card">
      <div className="resource-header">
        <h3>{resource.title}</h3>
        <div className="resource-type-badge">{resource.type}</div>
      </div>
      
      <div className="resource-actions">
        <button onClick={handleResourceOpen} className="btn-primary">
          Open Resource
        </button>
        
        <div className="progress-actions">
          <button 
            onClick={markCompleted}
            className={`btn-success ${progress?.isCompleted ? 'completed' : ''}`}
            disabled={progress?.isCompleted}
          >
            {progress?.isCompleted ? '✓ Completed' : 'Mark Complete'}
          </button>
          
          <button 
            onClick={markForRevision}
            className={`btn-warning ${progress?.markedForRevision ? 'marked' : ''}`}
          >
            {progress?.markedForRevision ? '⚠ Marked for Revision' : 'Mark for Revision'}
          </button>
        </div>
      </div>
      
      <div className="resource-note">
        <label>Personal Note:</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your thoughts, questions, or notes about this resource..."
          maxLength={1000}
        />
        <button onClick={updateNote} className="btn-secondary">
          Update Note
        </button>
      </div>
      
      {progress?.timeSpent && (
        <div className="time-spent">
          Time spent: {Math.floor(progress.timeSpent / 60)} minutes
        </div>
      )}
    </div>
  );
};
```

### Section Progress Overview
```javascript
const SectionProgress = ({ sectionId }) => {
  const [sectionData, setSectionData] = useState(null);
  
  useEffect(() => {
    fetchSectionProgress();
  }, [sectionId]);
  
  const fetchSectionProgress = async () => {
    try {
      const response = await fetch(`/api/resource-progress/section/${sectionId}/resources`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setSectionData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch section progress:', error);
    }
  };
  
  if (!sectionData) return <div>Loading...</div>;
  
  return (
    <div className="section-progress">
      <div className="section-header">
        <h2>{sectionData.section.name}</h2>
        <div className="progress-stats">
          <div className="stat">
            <span className="value">{sectionData.statistics.completionPercentage}%</span>
            <span className="label">Complete</span>
          </div>
          <div className="stat">
            <span className="value">{sectionData.statistics.completedResources}/{sectionData.statistics.totalResources}</span>
            <span className="label">Resources</span>
          </div>
          <div className="stat">
            <span className="value">{Math.floor(sectionData.statistics.totalTimeSpent / 60)}</span>
            <span className="label">Minutes</span>
          </div>
        </div>
      </div>
      
      <div className="resources-list">
        {sectionData.resources.map(resource => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
};
```

---

## 🎯 **KEY FEATURES**

### ✅ **Granular Progress Tracking**
- Track completion status for individual resources
- Time tracking for learning analytics
- Personal notes for each resource
- Revision marking for spaced repetition

### ✅ **User Experience Features**
- Automatic progress record creation
- Upsert operations for seamless updates
- Comprehensive progress statistics
- Easy reset functionality

### ✅ **Analytics Integration**
- Time spent tracking per resource
- Completion percentages at section level
- Revision patterns for learning optimization
- Progress history with timestamps

### ✅ **Security & Validation**
- User-specific progress isolation
- Input sanitization for notes
- Length validation for personal notes
- Comprehensive audit logging

---

## 📊 **LEARNING WORKFLOW**

1. **User opens a section** → Sees all resources with current progress
2. **User clicks on a resource** → Opens external link, starts time tracking
3. **User marks as completed** → Records completion with time and optional note
4. **User adds personal notes** → Saves thoughts and insights for future reference
5. **User marks for revision** → Flags difficult content for spaced repetition
6. **System tracks everything** → Provides analytics and progress insights

This comprehensive resource progress tracking system enables fine-grained learning analytics and improves user engagement through interactive progress management!
