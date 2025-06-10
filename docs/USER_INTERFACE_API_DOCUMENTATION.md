# OpenLearn User Interface API Documentation

## Overview
This document covers all the **user-facing endpoints** that Pioneers (students) can use to interact with the OpenLearn platform. These routes allow users to discover courses, enroll in leagues, track their progress, and manage their learning journey.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All user endpoints require JWT authentication:
```
Authorization: Bearer <access_token>
```

---

## 🎓 **COURSE DISCOVERY & ENROLLMENT**

### 1. Browse Available Cohorts
**Endpoint:** `GET /api/cohorts`  
**Access:** All authenticated users  
**Description:** View all available cohorts to enroll in

**Response:**
```json
{
  "success": true,
  "data": {
    "cohorts": [
      {
        "id": "cohort_id",
        "name": "Cohort 1",
        "description": "First cohort of OpenLearn pioneers",
        "isActive": true,
        "specializations": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 2. View Cohort Details
**Endpoint:** `GET /api/cohorts/:id`  
**Access:** All authenticated users  
**Description:** Get detailed information about a specific cohort

### 3. Browse Available Leagues
**Endpoint:** `GET /api/leagues`  
**Access:** All authenticated users  
**Description:** View all available leagues (courses) you can enroll in

**Response:**
```json
{
  "success": true,
  "data": {
    "leagues": [
      {
        "id": "ai_ml_league_id",
        "name": "AI/ML League",
        "description": "Artificial Intelligence and Machine Learning fundamentals",
        "weeksCount": 4,
        "sectionsCount": 12
      },
      {
        "id": "finance_league_id", 
        "name": "Finance League",
        "description": "Financial markets, trading, and investment fundamentals",
        "weeksCount": 3,
        "sectionsCount": 9
      }
    ]
  }
}
```

### 4. View League Details
**Endpoint:** `GET /api/leagues/:id`  
**Access:** All authenticated users  
**Description:** Get detailed curriculum for a specific league

### 5. Browse Specializations
**Endpoint:** `GET /api/specializations`  
**Access:** All authenticated users  
**Description:** View available specializations (combinations of leagues)

### 6. Enroll in League
**Endpoint:** `POST /api/progress/enroll`  
**Access:** All authenticated users  
**Description:** Enroll yourself in a cohort and league to start learning

**Request Body:**
```json
{
  "cohortId": "cohort_id",
  "leagueId": "ai_ml_league_id"
}
```

---

## 📚 **LEARNING & PROGRESS**

### 7. View League Content Structure
**Endpoint:** `GET /api/weeks/league/:leagueId`  
**Access:** All authenticated users  
**Description:** See all weeks in a league you're enrolled in

**Response:**
```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "id": "week_1_id",
        "name": "Week 1: Introduction to ML",
        "description": "Foundations of ML, basic concepts",
        "order": 1,
        "sectionsCount": 3
      }
    ]
  }
}
```

### 8. View Week Content
**Endpoint:** `GET /api/weeks/:id/sections`  
**Access:** All authenticated users  
**Description:** See all sections within a specific week

### 9. View Section Details
**Endpoint:** `GET /api/sections/:id`  
**Access:** All authenticated users  
**Description:** View a specific section with learning resources and your progress

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "section_id",
    "name": "Introduction to Machine Learning",
    "description": "Basic concepts, history, and applications of ML",
    "order": 1,
    "resources": [
      {
        "id": "resource_1",
        "title": "ML Fundamentals Video",
        "url": "https://youtu.be/example",
        "type": "VIDEO"
      },
      {
        "id": "resource_2", 
        "title": "Introduction to ML - Blog Post",
        "url": "https://blog.example.com/ml-intro",
        "type": "BLOG"
      }
    ],
    "userProgress": {
      "isCompleted": false,
      "personalNote": null,
      "markedForRevision": false
    }
  }
}
```

### 10. View Section Resources
**Endpoint:** `GET /api/sections/:sectionId/resources`  
**Access:** All authenticated users  
**Description:** Get all learning materials for a section

---

## ✅ **PROGRESS TRACKING**

### 11. Mark Section Complete
**Endpoint:** `POST /api/progress/sections/:sectionId/complete`  
**Access:** All authenticated users  
**Description:** Mark a section as completed and add personal notes

**Request Body:**
```json
{
  "personalNote": "Great introduction to the field! Need to review neural networks.",
  "markedForRevision": false
}
```

### 12. Update Section Notes
**Endpoint:** `PUT /api/progress/sections/:sectionId`  
**Access:** All authenticated users  
**Description:** Update personal notes or revision flag without marking complete

**Request Body:**
```json
{
  "personalNote": "Updated notes after second review",
  "markedForRevision": true
}
```

### 13. View League Progress
**Endpoint:** `GET /api/progress/leagues/:leagueId`  
**Access:** All authenticated users  
**Description:** See your detailed progress through a league

**Response:**
```json
{
  "success": true,
  "data": {
    "league": {
      "id": "ai_ml_league_id",
      "name": "AI/ML League"
    },
    "progress": {
      "totalSections": 12,
      "completedSections": 5,
      "progressPercentage": 42,
      "weeks": [
        {
          "id": "week_1",
          "name": "Week 1: ML Fundamentals", 
          "sections": [
            {
              "id": "section_1",
              "name": "Introduction to ML",
              "progress": {
                "isCompleted": true,
                "completedAt": "2025-06-10T12:00:00.000Z",
                "personalNote": "Great intro section",
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
      "earnedAt": "2025-06-10T15:00:00.000Z"
    }
  }
}
```

### 14. Personal Dashboard
**Endpoint:** `GET /api/progress/dashboard`  
**Access:** All authenticated users  
**Description:** Your complete learning dashboard across all enrollments

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Pioneer",
      "role": "PIONEER"
    },
    "statistics": {
      "totalEnrollments": 2,
      "totalSections": 21,
      "totalCompletedSections": 8,
      "overallProgress": 38,
      "badgesEarned": 1,
      "specializationsCompleted": 0
    },
    "enrollments": [
      {
        "league": {
          "id": "ai_ml_league_id",
          "name": "AI/ML League"
        },
        "progress": {
          "totalSections": 12,
          "completedSections": 5,
          "progressPercentage": 42
        }
      }
    ],
    "badges": [
      {
        "id": "badge_id",
        "name": "Python Fundamentals Badge",
        "description": "Completed all Python sections",
        "earnedAt": "2025-06-10T15:00:00.000Z"
      }
    ]
  }
}
```

---

## 🏆 **ACHIEVEMENTS & SOCIAL**

### 15. View Your Badges
**Endpoint:** `GET /api/progress/dashboard`  
**Access:** All authenticated users  
**Description:** See all badges you've earned (included in dashboard response)

### 16. Generate Twitter Share Link
**Endpoint:** `GET /api/social/twitter/section/:sectionId`  
**Access:** All authenticated users  
**Description:** Get a Twitter share link for completing a section

**Response:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://twitter.com/intent/tweet?text=...",
    "shareText": "🚀 Just completed \"Introduction to ML\" in AI/ML league on @OpenLearnPlatform! \n\nMaking progress in my learning journey 📚\n\n#OpenLearn #Learning #AIML"
  }
}
```

### 17. Generate LinkedIn Share Link  
**Endpoint:** `GET /api/social/linkedin/week/:weekId`  
**Access:** All authenticated users  
**Description:** Get a LinkedIn share link for completing a week

---

## 📝 **ASSIGNMENTS**

### 18. View League Assignment
**Endpoint:** `GET /api/assignments/league/:leagueId`  
**Access:** Enrolled users only  
**Description:** View the assignment for a league you're enrolled in

### 19. Submit Assignment
**Endpoint:** `POST /api/assignments/:assignmentId/submit`  
**Access:** Enrolled users only  
**Description:** Submit your assignment solution

**Request Body:**
```json
{
  "submissionType": "GITHUB_LINK",
  "content": "https://github.com/username/my-ml-project",
  "description": "My machine learning project implementing linear regression"
}
```

### 20. View Your Submissions
**Endpoint:** `GET /api/assignments/my-submissions`  
**Access:** All authenticated users  
**Description:** See all your assignment submissions

---

## 🔍 **USER ACCOUNT**

### 21. View Your Profile
**Endpoint:** `GET /api/analytics/user/:userId`  
**Access:** All authenticated users (own profile)  
**Description:** Get your complete learning analytics and performance report

---

## 🎯 **TYPICAL USER WORKFLOW**

### **New User Journey:**
1. **Browse Cohorts** → `GET /api/cohorts`
2. **Explore Leagues** → `GET /api/leagues`
3. **Enroll in League** → `POST /api/progress/enroll`
4. **View Week Structure** → `GET /api/weeks/league/:leagueId`
5. **Study Section** → `GET /api/sections/:id`
6. **Complete Section** → `POST /api/progress/sections/:sectionId/complete`
7. **Share Progress** → `GET /api/social/twitter/section/:sectionId`
8. **Check Dashboard** → `GET /api/progress/dashboard`

### **Daily Learning Flow:**
1. **Check Dashboard** → `GET /api/progress/dashboard`
2. **Continue League** → `GET /api/progress/leagues/:leagueId`
3. **Study Next Section** → `GET /api/sections/:id`
4. **Mark Complete** → `POST /api/progress/sections/:sectionId/complete`
5. **Share Achievement** → `GET /api/social/twitter/section/:sectionId`

---

## 💡 **KEY FEATURES FOR USERS**

✅ **Course Discovery** - Browse cohorts, leagues, and specializations  
✅ **Self-Enrollment** - Join leagues independently  
✅ **Progress Tracking** - Track completion percentage and personal notes  
✅ **Personal Dashboard** - Complete overview of learning journey  
✅ **Badge System** - Automatic badge awarding upon league completion  
✅ **Social Sharing** - Twitter/LinkedIn integration for achievements  
✅ **Assignment System** - Submit and track assignment progress  
✅ **Learning Resources** - Access videos, blogs, and external links  
✅ **Personal Notes** - Add private notes to each section  
✅ **Revision Marking** - Flag sections for future review  


simple example in frontend
```
// Example React component for user enrollment flow

import React, { useState, useEffect } from 'react';

const EnrollmentFlow = () => {
  const [cohorts, setCohorts] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load available cohorts when component mounts
  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      const response = await fetch('/api/cohorts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setCohorts(data.data.cohorts);
    } catch (error) {
      console.error('Failed to fetch cohorts:', error);
    }
  };

  const fetchLeagues = async () => {
    try {
      const response = await fetch('/api/leagues', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setLeagues(data.data.leagues);
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    }
  };

  const handleCohortSelect = (cohort) => {
    setSelectedCohort(cohort);
    fetchLeagues(); // Load leagues when cohort is selected
  };

  const handleEnrollment = async () => {
    if (!selectedCohort || !selectedLeague) {
      alert('Please select both cohort and league');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/progress/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          cohortId: selectedCohort.id,
          leagueId: selectedLeague.id
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Enrollment successful! Welcome to the learning journey!');
        // Redirect to league dashboard
        window.location.href = `/dashboard/leagues/${selectedLeague.id}`;
      } else {
        alert(`Enrollment failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Enrollment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enrollment-flow">
      <h1>🎓 Join OpenLearn - Start Your Learning Journey</h1>
      
      {/* Step 1: Select Cohort */}
      <div className="step">
        <h2>Step 1: Choose Your Cohort</h2>
        <div className="cohort-grid">
          {cohorts.map(cohort => (
            <div 
              key={cohort.id}
              className={`cohort-card ${selectedCohort?.id === cohort.id ? 'selected' : ''}`}
              onClick={() => handleCohortSelect(cohort)}
            >
              <h3>{cohort.name}</h3>
              <p>{cohort.description}</p>
              <span className={`status ${cohort.isActive ? 'active' : 'inactive'}`}>
                {cohort.isActive ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Select League (only show if cohort selected) */}
      {selectedCohort && (
        <div className="step">
          <h2>Step 2: Choose Your League</h2>
          <p>Selected Cohort: <strong>{selectedCohort.name}</strong></p>
          <div className="league-grid">
            {leagues.map(league => (
              <div 
                key={league.id}
                className={`league-card ${selectedLeague?.id === league.id ? 'selected' : ''}`}
                onClick={() => setSelectedLeague(league)}
              >
                <h3>{league.name}</h3>
                <p>{league.description}</p>
                <div className="league-stats">
                  <span>📅 {league.weeksCount} weeks</span>
                  <span>📚 {league.sectionsCount} sections</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Confirm Enrollment */}
      {selectedCohort && selectedLeague && (
        <div className="step">
          <h2>Step 3: Confirm Enrollment</h2>
          <div className="enrollment-summary">
            <p><strong>Cohort:</strong> {selectedCohort.name}</p>
            <p><strong>League:</strong> {selectedLeague.name}</p>
            <p><strong>Description:</strong> {selectedLeague.description}</p>
          </div>
          
          <button 
            className="enroll-button"
            onClick={handleEnrollment}
            disabled={loading}
          >
            {loading ? '⏳ Enrolling...' : '🚀 Start Learning Journey'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnrollmentFlow;

```
