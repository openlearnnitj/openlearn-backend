# OpenLearn Backend

<div align="center">

![OpenLearn Logo](https://avatars.githubusercontent.com/u/208047818?s=200&v=4)

**A comprehensive TypeScript backend for cohort-based educational platforms**  
*Featuring role-based learning paths, specializations, progress tracking, and gamification*

[![Website](https://img.shields.io/badge/Website-openlearn.org.in-blue?style=for-the-badge&logo=web)](https://openlearn.org.in)
[![Status](https://img.shields.io/badge/Status-Production-green?style=for-the-badge)](https://openlearn.org.in/status-page)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

## Documentation

### Authentication & Security
- **[AUTH_API_DOCUMENTATION.md](./docs/AUTH_API_DOCUMENTATION.md)** - Complete authentication system
- **[AUTH_SYSTEM_COMPLETE.md](./docs/AUTH_SYSTEM_COMPLETE.md)** - Authentication architecture overview

### Core Learning Features
- **[ADMIN_COURSE_API_DOCUMENTATION.md](./docs/ADMIN_COURSE_API_DOCUMENTATION.md)** - Course management system
- **[WEEK_MANAGEMENT_API_DOCUMENTATION.md](./docs/WEEK_MANAGEMENT_API_DOCUMENTATION.md)** - Weekly content structure
- **[SECTION_MANAGEMENT_API_DOCUMENTATION.md](./docs/SECTION_MANAGEMENT_API_DOCUMENTATION.md)** - Section management
- **[RESOURCE_MANAGEMENT_API_DOCUMENTATION.md](./docs/RESOURCE_MANAGEMENT_API_DOCUMENTATION.md)** - Learning resources
- **[ASSIGNMENT_MANAGEMENT_API_DOCUMENTATION.md](./docs/ASSIGNMENT_MANAGEMENT_API_DOCUMENTATION.md)** - Assignment system

### Progress & Analytics
- **[PROGRESS_TRACKING_API_DOCUMENTATION.md](./docs/PROGRESS_TRACKING_API_DOCUMENTATION.md)** - Learning progress tracking
- **[RESOURCE_PROGRESS_API_DOCUMENTATION.md](./docs/RESOURCE_PROGRESS_API_DOCUMENTATION.md)** - Resource completion tracking
- **[ANALYTICS_API_DOCUMENTATION.md](./docs/ANALYTICS_API_DOCUMENTATION.md)** - Platform analytics
- **[LEADERBOARD_API_DOCUMENTATION.md](./docs/LEADERBOARD_API_DOCUMENTATION.md)** - Competitive features

### Gamification & Social
- **[BADGE_MANAGEMENT_API_DOCUMENTATION.md](./docs/BADGE_MANAGEMENT_API_DOCUMENTATION.md)** - Achievement system
- **[SOCIAL_SHARING_API_DOCUMENTATION.md](./docs/SOCIAL_SHARING_API_DOCUMENTATION.md)** - Social features

### Developer Resources
- **[API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - Complete API reference
- **[FRONTEND_INTEGRATION.md](./docs/FRONTEND_INTEGRATION.md)** - Frontend developer guide
- **[USER_INTERFACE_API_DOCUMENTATION.md](./docs/USER_INTERFACE_API_DOCUMENTATION.md)** - UI integration guide
- **[OPENLEARN_BACKEND_COMPLETE.md](./docs/OPENLEARN_BACKEND_COMPLETE.md)** - Complete backend overview

## Platform Overview

OpenLearn is a sophisticated educational platform designed for **cohort-based learning** with hierarchical role management, structured curriculum delivery, and comprehensive progress tracking. Built for institutions requiring advanced user management, content organization, and student engagement features.

### Core Features

**Cohort-Based Learning Structure**
- Organized cohorts with specialized learning paths
- Multi-league specializations (AI/ML, Finance, etc.)
- Structured week-by-week curriculum delivery
- Section-based content organization

**Advanced Role Management**
- **Pioneers**: Students/Learners with progress tracking
- **Pathfinders**: Educators/Mentors with content management
- **Hierarchical Roles**: Grand Pathfinder, Chief Pathfinders, Luminaries
- Granular permission system with role-based access control

**Comprehensive Content Management**
- Multi-format resources (blogs, videos, articles, external links)
- Assignment submission system
- Progress tracking at section and resource levels
- Personal notes and revision marking

**Gamification & Achievement System**
- League-specific badge system
- Specialization completion certificates
- Progress-based achievements
- Social sharing capabilities

**Analytics & Monitoring**
- Detailed progress analytics
- Leaderboard systems
- Comprehensive audit logging
- Real-time system status monitoring

## Technical Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web Dashboard]
        MOBILE[Mobile App]
        STATUS[Status Page]
    end
    
    subgraph "API Gateway"
        EXPRESS[Express.js Server]
        AUTH_MW[Auth Middleware]
        RBAC[RBAC Middleware]
    end
    
    subgraph "Core Services"
        USER_SVC[User Management]
        COHORT_SVC[Cohort Service]
        CONTENT_SVC[Content Management]
        PROGRESS_SVC[Progress Tracking]
        BADGE_SVC[Badge System]
        STATUS_SVC[Status Monitoring]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    WEB --> EXPRESS
    MOBILE --> EXPRESS
    STATUS --> EXPRESS
    EXPRESS --> AUTH_MW
    AUTH_MW --> RBAC
    RBAC --> USER_SVC
    RBAC --> COHORT_SVC
    RBAC --> CONTENT_SVC
    RBAC --> PROGRESS_SVC
    RBAC --> BADGE_SVC
    EXPRESS --> STATUS_SVC
    
    USER_SVC --> POSTGRES
    COHORT_SVC --> POSTGRES
    CONTENT_SVC --> POSTGRES
    PROGRESS_SVC --> POSTGRES
    BADGE_SVC --> POSTGRES
    STATUS_SVC --> POSTGRES
```

### Educational Platform Flow

```mermaid
sequenceDiagram
    participant Student as Pioneer (Student)
    participant Platform as OpenLearn API
    participant Educator as Pathfinder (Educator)
    participant System as Progress System
    
    Student->>Platform: Login & Join Cohort
    Platform->>System: Initialize Progress Tracking
    Educator->>Platform: Create Week Content
    Platform->>Student: Notify New Content Available
    Student->>Platform: Access Resources & Complete Sections
    Platform->>System: Update Progress
    System->>Platform: Check Badge Eligibility
    Platform->>Student: Award Badges/Achievements
    Student->>Platform: Submit Assignment
    Platform->>Educator: Notify New Submission
    Educator->>Platform: Review & Grade
    Platform->>Student: Update Grade & Progress
```

### Database Schema (Core Educational Models)

```mermaid
erDiagram
    User ||--o{ Enrollment : has
    User ||--o{ SectionProgress : tracks
    User ||--o{ ResourceProgress : completes
    User ||--o{ UserBadge : earns
    User ||--o{ UserSpecialization : achieves
    User ||--o{ AssignmentSubmission : submits
    User ||--o{ AuditLog : generates
    
    Cohort ||--o{ Enrollment : contains
    Cohort ||--o{ Specialization : offers
    
    Specialization ||--o{ SpecializationLeague : connects
    League ||--o{ SpecializationLeague : belongs
    League ||--o{ Week : organizes
    League ||--o{ Badge : offers
    League ||--o{ Assignment : contains
    
    Week ||--o{ Section : includes
    Section ||--o{ SectionResource : contains
    Section ||--o{ SectionProgress : tracked_by
    
    SectionResource ||--o{ ResourceProgress : measured_by
    Assignment ||--o{ AssignmentSubmission : receives
    Badge ||--o{ UserBadge : awarded_as
    
    User {
        string id PK
        string email UK
        string password
        string name
        UserRole role
        UserStatus status
    }
    
    Cohort {
        string id PK
        string name
        string description
        boolean isActive
    }
    
    Specialization {
        string id PK
        string cohortId FK
        string name
        string description
    }
    
    League {
        string id PK
        string name
        string description
    }
    
    Week {
        string id PK
        string leagueId FK
        string name
        string description
        int order
    }
    
    Section {
        string id PK
        string weekId FK
        string name
        string description
        int order
    }
    
    SectionResource {
        string id PK
        string sectionId FK
        string title
        string url
        ResourceType type
        int order
    }
    
    Assignment {
        string id PK
        string leagueId FK
        string title
        string description
        datetime dueDate
    }
    
    SectionProgress {
        string id PK
        string userId FK
        string sectionId FK
        boolean isCompleted
        datetime completedAt
        string personalNote
        boolean markedForRevision
    }
    
    ResourceProgress {
        string id PK
        string userId FK
        string resourceId FK
        boolean isCompleted
        datetime completedAt
        string personalNote
        boolean markedForRevision
        int timeSpent
    }
    
    AssignmentSubmission {
        string id PK
        string assignmentId FK
        string userId FK
        string content
        string githubUrl
        string liveUrl
        AssignmentStatus status
        datetime submittedAt
    }
```

### Monitoring Architecture

```mermaid
graph TB
    subgraph "Health Monitoring System"
        SCHEDULER[Node-Cron Scheduler<br/>Every 5 Minutes]
        HEALTH_SVC[Health Check Service]
        STATUS_SVC[Status Service]
    end
    
    subgraph "System Components"
        API[API Health Check]
        DB[Database Connectivity]
        AUTH[Authentication System]
    end
    
    subgraph "Status Storage"
        STATUS_CHECKS[(SystemStatus)]
        INCIDENTS[(StatusIncident)]
        UPDATES[(IncidentUpdate)]
    end
    
    subgraph "External Monitoring"
        GITHUB_ACTIONS[GitHub Actions<br/>Keep-Alive Pings]
        RENDER[Render Hosting]
    end
    
    SCHEDULER --> HEALTH_SVC
    HEALTH_SVC --> API
    HEALTH_SVC --> DB
    HEALTH_SVC --> AUTH
    HEALTH_SVC --> STATUS_SVC
    STATUS_SVC --> STATUS_CHECKS
    STATUS_SVC --> INCIDENTS
    STATUS_SVC --> UPDATES
    
    GITHUB_ACTIONS --> RENDER
    RENDER --> API
```

## Project Structure

```
├── prisma/
│   ├── migrations/          # Database migrations
│   ├── schema.prisma       # Database schema
│   └── seed.ts            # Database seeding
├── public/
│   ├── favicon.ico        # Website favicon
│   ├── simple-status.html # Simple status page
│   └── status-page.html   # Advanced status dashboard
├── src/
│   ├── app.ts             # Express application setup
│   ├── server.ts          # Server entry point
│   ├── config/            # Configuration management
│   │   ├── database.ts    # Database configuration
│   │   ├── environment.ts # Environment variables
│   │   ├── index.ts       # Config exports
│   │   └── logger.ts      # Logging configuration
│   ├── controllers/       # Request handlers
│   │   ├── adminController.ts
│   │   ├── analyticsController.ts
│   │   ├── assignmentController.ts
│   │   ├── authController.ts
│   │   ├── badgeController.ts
│   │   ├── cohortController.ts
│   │   ├── leaderboardController.ts
│   │   ├── leagueController.ts
│   │   ├── progressController.ts
│   │   ├── resourceController.ts
│   │   ├── resourceProgressController.ts
│   │   ├── sectionController.ts
│   │   ├── socialController.ts
│   │   ├── specializationController.ts
│   │   └── weekController.ts
│   ├── middleware/        # Application middleware
│   │   ├── asyncHandler.ts
│   │   ├── authorization.ts
│   │   ├── authorize.ts
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   ├── index.ts
│   │   ├── logging.ts
│   │   ├── security.ts
│   │   └── validation.ts
│   ├── routes/           # API route definitions
│   │   ├── admin.ts
│   │   ├── analytics.ts
│   │   ├── assignments.ts
│   │   ├── auth.ts
│   │   ├── badges.ts
│   │   ├── cohorts.ts
│   │   ├── index.ts
│   │   ├── leaderboard.ts
│   │   ├── leagues.ts
│   │   ├── progress.ts
│   │   ├── resourceProgress.ts
│   │   ├── resources.ts
│   │   ├── sections.ts
│   │   ├── social.ts
│   │   ├── specializations.ts
│   │   ├── status.ts
│   │   └── weeks.ts
│   ├── services/         # Business logic layer
│   │   ├── authService.ts
│   │   ├── HealthCheckScheduler.ts
│   │   ├── leaderboardService.ts
│   │   └── StatusService.ts
│   ├── scripts/          # Utility scripts
│   │   ├── seedAdmin.ts
│   │   └── testNeonLocal.ts
│   ├── types/            # TypeScript definitions
│   │   └── index.ts
│   └── utils/            # Helper functions
│       ├── auth.ts
│       ├── common.ts
│       ├── jwt.ts
│       ├── logger.ts
│       ├── password.ts
│       └── validation.ts
├── README.md             # This file
├── render-build.sh       # Build script for Render
├── render.yaml          # Render deployment config
└── tsconfig.json        # TypeScript configuration
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript 5.0+
- **Framework**: Express.js 4.18+ with async/await patterns
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh token rotation
- **Validation**: express-validator with custom rules
- **Security**: Helmet.js + custom middleware
- **Caching**: Redis for session management
- **Deployment**: Render.com with Docker containers

### Request Flow Architecture
```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant M as Middleware
    participant S as Service Layer
    participant DB as PostgreSQL
    participant R as Redis
    
    C->>API: HTTP Request
    API->>M: Security Check
    M->>M: Rate Limiting
    M->>M: Authentication
    M->>M: Input Validation
    M->>S: Business Logic
    S->>DB: Database Query
    S->>R: Cache Check/Update
    S->>API: Response Data
    API->>C: JSON Response
```

## User Roles & Permissions

### Role Hierarchy
- **GRAND_PATHFINDER**: System super-admin with full platform access
- **CHIEF_PATHFINDER**: Administrative role with management capabilities
- **PATHFINDER**: Educator/mentor role with content creation rights
- **PIONEER**: Student/learner role with progress tracking
- **LUMINARY**: Special achievement role for distinguished users

### Permission Matrix
```
Resource               | PIONEER | PATHFINDER | CHIEF_PATHFINDER | GRAND_PATHFINDER
--------------------- |---------|------------|------------------|------------------
View Content          |    ✓    |     ✓      |        ✓         |        ✓
Submit Assignments    |    ✓    |     ✓      |        ✓         |        ✓
Create Content        |    ✗    |     ✓      |        ✓         |        ✓
Manage Users          |    ✗    |     ✗      |        ✓         |        ✓
System Administration |    ✗    |     ✗      |        ✗         |        ✓
```

## API Overview

### Essential Endpoints
```bash
# Health & Status
GET  /health              # System health check
GET  /api/status          # Detailed system status
GET  /status-page         # Visual status dashboard

# Authentication
POST /api/auth/register   # User registration
POST /api/auth/login      # User login
POST /api/auth/refresh    # Token refresh
POST /api/auth/logout     # User logout

# Learning Content
GET  /api/cohorts         # List cohorts
GET  /api/leagues         # List leagues
GET  /api/weeks           # List weeks
GET  /api/sections        # List sections
GET  /api/resources       # List resources

# Progress Tracking
GET  /api/progress        # User progress
POST /api/progress/section # Mark section complete
POST /api/progress/resource # Mark resource complete

# Assignments
GET  /api/assignments     # List assignments
POST /api/assignments/submit # Submit assignment

# Gamification
GET  /api/badges          # List badges
GET  /api/leaderboard     # Leaderboard data
```

## Security Features

### Authentication & Authorization
- **JWT Authentication** - Access tokens (15min) + refresh tokens (7 days)
- **Role-Based Access Control (RBAC)** - Hierarchical permission system
- **Password Security** - bcrypt hashing with salt rounds
- **Token Rotation** - Automatic refresh token rotation for security

### Input Validation & Security
- **Input Validation & Sanitization** - express-validator with custom rules
- **Rate Limiting** - 5 req/15min for auth, 100 req/15min general
- **CORS Protection** - Configurable cross-origin policies
- **Security Headers** - Helmet.js middleware
- **Database Security** - Prisma ORM with prepared statements

### Security Architecture
```mermaid
graph TB
    Client[Client Request] --> CORS[CORS Validation]
    CORS --> Headers[Security Headers]
    Headers --> Rate[Rate Limiting]
    Rate --> Auth[JWT Authentication]
    Auth --> RBAC[Role-Based Authorization]
    RBAC --> Valid[Input Validation]
    Valid --> Sanitize[Data Sanitization]
    Sanitize --> Controller[Controller Logic]
    
    subgraph "Security Layers"
        CORS
        Headers
        Rate
        Auth
        RBAC
        Valid
        Sanitize
    end
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database
- Redis server (optional for development)

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd openlearn-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Environment Configuration
```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=OpenLearn Backend

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/openlearn_dev"

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secure-refresh-token-secret-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (optional for development)
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
```

### Database Commands
```bash
# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# View database
npx prisma studio

# Seed database
npx prisma db seed
```

## System Status & Monitoring

### Real-time Monitoring
Our production system includes comprehensive monitoring:

- **Real-time Health Checks** - Every 5 minutes across all components
- **Uptime Tracking** - 24h/7d/30d uptime statistics
- **Performance Metrics** - Response times and system resources
- **Incident Management** - Automatic issue detection and reporting
- **Keep-Alive System** - Prevents cold starts on free tier hosting

### Monitored Components
- **API Server** - Main application endpoints
- **Database** - PostgreSQL connection and performance
- **Authentication** - JWT token validation and user sessions

### Status Dashboard
Visit [openlearn.org.in/status-page](https://openlearn.org.in/status-page) for real-time system status including:
- Component health status
- Response time metrics
- Uptime statistics
- Recent incidents and updates

## Deployment

### Production Deployment (Render.com)
The application is deployed on Render.com with the following configuration:

```yaml
# render.yaml
services:
  - type: web
    name: openlearn-backend
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: openlearn-postgres
          property: connectionString
```

### Deployment Commands
```bash
# Build for production
npm run build

# Start production server
npm start

# Production database migration
npx prisma migrate deploy
```

### Live Deployment
- **Production Website**: [https://openlearn.org.in](https://openlearn.org.in)
- **System Status**: [https://openlearn.org.in/status-page](https://openlearn.org.in/status-page)
- **API Base URL**: `https://openlearn.org.in/api`
- **Health Check**: [https://openlearn.org.in/health](https://openlearn.org.in/health)

## Database Schema

### Core Models

**User Management**
- Users with role-based access control
- User status management (pending, active, suspended)
- Social profile integration
- Self-referential approval workflow

**Educational Structure**
- Cohorts containing multiple specializations
- Specializations combining multiple leagues
- Leagues organized into weekly content
- Weeks containing multiple sections
- Sections with various resource types

**Progress Tracking**
- Section completion tracking
- Resource-level progress monitoring
- Personal notes and revision marking
- Time tracking for resources

**Gamification**
- Badge system tied to leagues
- User achievements and specializations
- Leaderboard and competitive features

**Assignment System**
- League-specific assignments
- Multiple submission formats (text, GitHub, live URLs)
- Submission status tracking

**Audit & Monitoring**
- Comprehensive audit logging
- System status monitoring
- Incident management
- Real-time health checks

## API Architecture

### RESTful Design Principles
- Resource-based URLs
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Consistent JSON response format
- Proper HTTP status codes
- Pagination for large datasets

### Response Format
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Valid email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123456"
  }
}
```

## Performance & Scalability

### Database Optimization
- Proper indexing on frequently queried fields
- Prisma query optimization
- Connection pooling
- Efficient relationship loading

### Caching Strategy
- Redis for session management
- API response caching for static content
- Database query result caching
- CDN integration for static assets

### Monitoring & Alerting
- Application performance monitoring
- Database performance tracking
- Error rate monitoring
- Uptime monitoring with alerts

## Contributing

We welcome contributions to improve the OpenLearn platform. Here's how you can help:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code style
- Update documentation when needed

### Pull Request Guidelines
- Provide a clear description of changes
- Include relevant issue numbers
- Update documentation if needed
- Ensure all checks pass
- Request review from maintainers

## Support & Contact

### Getting Help
- **Documentation**: Comprehensive API docs in the `/docs` directory
- **Issues**: Create an issue in this repository for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and community support

### Project Links
- **Website**: [openlearn.org.in](https://openlearn.org.in)
- **Status Page**: [openlearn.org.in/status-page](https://openlearn.org.in/status-page)
- **API Documentation**: Available in the `/docs` directory
- **GitHub Repository**: [Link to repository]

### Reporting Issues
When reporting issues, please include:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant logs or error messages

---

<div align="center">

**Built with dedication for the future of education**

*OpenLearn Platform • TypeScript Backend API*

**Version 1.0.0** • **Production Ready** • **Open Source**

</div>