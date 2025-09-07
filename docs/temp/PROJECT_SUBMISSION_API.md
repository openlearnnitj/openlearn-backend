# Project Submission System (Temporary - Bit n Build Hackathon)

## Overview
Simple project submission system for hackathon participants. Validates that all team members are registered and verified users on the OpenLearn platform.

## API Endpoints

### 1. Submit Project
**POST** `/api/project-submissions/submit`

**Access:** Public (validates team members are registered)

**Request Body:**
```json
{
  "teamNumber": 1,
  "teamName": "Team Alpha",
  "teamLead": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "member2": {
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "member3": {  // Optional
    "name": "Bob Wilson",
    "email": "bob@example.com"
  },
  "member4": {  // Optional
    "name": "Alice Brown",
    "email": "alice@example.com"
  },
  "projectTitle": "AI-Powered Learning Platform",
  "projectDescription": "An innovative platform that uses AI to personalize learning experiences for students.",
  "demoYoutubeLink": "https://youtube.com/watch?v=demo123",
  "githubUrl": "https://github.com/team-alpha/project",
  "deployedUrl": "https://project.team-alpha.com"  // Optional
}
```

**Validations:**
- Team Lead and Member 2 are **mandatory**
- Member 3 and Member 4 are **optional**
- All provided email addresses must:
  - Be registered on the platform
  - Have verified email addresses
  - Have active account status
- Team number must be unique
- No duplicate emails within the team

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "submissionId": 123,
    "teamNumber": 1,
    "teamName": "Team Alpha",
    "submittedAt": "2025-09-07T00:00:00.000Z"
  },
  "message": "Project submitted successfully!"
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "error": "Some team members are not registered on the platform",
  "details": {
    "unregisteredEmails": ["notfound@example.com"],
    "message": "These email addresses are not registered. Please ensure all team members have accounts on the platform."
  }
}
```

### 2. Get All Submissions (Admin)
**GET** `/api/project-submissions/admin`

**Access:** GRAND_PATHFINDER only

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "submissionId": 1,
        "teamNumber": 1,
        "teamName": "Team Alpha",
        "teamLeadName": "John Doe",
        "teamLeadEmail": "john@example.com",
        "member2Name": "Jane Smith",
        "member2Email": "jane@example.com",
        "member3Name": "Bob Wilson",
        "member3Email": "bob@example.com",
        "member4Name": null,
        "member4Email": null,
        "projectTitle": "AI-Powered Learning Platform",
        "projectDescription": "An innovative platform...",
        "demoYoutubeLink": "https://youtube.com/watch?v=demo123",
        "githubUrl": "https://github.com/team-alpha/project",
        "deployedUrl": "https://project.team-alpha.com",
        "submittedAt": "2025-09-07T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "message": "Project submissions retrieved successfully"
}
```

### 3. Get Submission Statistics (Admin)
**GET** `/api/project-submissions/admin/stats`

**Access:** GRAND_PATHFINDER only

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSubmissions": 15,
    "todaySubmissions": 3,
    "timestamp": "2025-09-07T12:00:00.000Z"
  }
}
```

## Error Responses

### Unregistered Users
```json
{
  "success": false,
  "error": "Some team members are not registered on the platform",
  "details": {
    "unregisteredEmails": ["notfound@example.com"],
    "message": "These email addresses are not registered. Please ensure all team members have accounts on the platform."
  }
}
```

### Unverified Email
```json
{
  "success": false,
  "error": "Some team members have unverified email addresses",
  "details": {
    "unverifiedEmails": ["unverified@example.com"],
    "message": "These team members need to verify their email addresses before submitting."
  }
}
```

### Inactive Account
```json
{
  "success": false,
  "error": "Some team members have inactive accounts",
  "details": {
    "inactiveEmails": ["suspended@example.com"],
    "message": "These team members have inactive accounts. Please contact support."
  }
}
```

### Duplicate Team Number
```json
{
  "success": false,
  "error": "Team number already exists",
  "details": "This team number has already been used. Please choose a different team number."
}
```

### Access Denied (Admin endpoints)
```json
{
  "success": false,
  "error": "Access denied",
  "message": "Only Grand Pathfinders can view project submissions"
}
```

## Testing

Run the test script to verify the setup:
```bash
./scripts/testing/test-project-submissions.sh
```

## Database Schema

The system uses a simple table structure:
```sql
CREATE TABLE project_submissions (
    submission_id SERIAL PRIMARY KEY,
    team_number INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    team_lead_name VARCHAR(100) NOT NULL,
    team_lead_email VARCHAR(150) NOT NULL,
    member2_name VARCHAR(100) NOT NULL,
    member2_email VARCHAR(150) NOT NULL,
    member3_name VARCHAR(100),
    member3_email VARCHAR(150),
    member4_name VARCHAR(100),
    member4_email VARCHAR(150),
    project_title VARCHAR(200) NOT NULL,
    project_description TEXT NOT NULL,
    demo_youtube_link TEXT NOT NULL,
    github_url TEXT NOT NULL,
    deployed_url TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);
```

## Notes

- This is a **temporary system** for hackathon use
- Keep it simple - focused on core functionality only
- All team member validation happens against the existing User table
- No complex features like editing submissions or team management
- Admin access is restricted to GRAND_PATHFINDER role only
