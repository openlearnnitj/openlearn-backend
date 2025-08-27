# OpenLearn Backend

<div align="center">

**A comprehensive TypeScript backend for cohort-based educational platforms**

*Modern educational platform featuring role-based learning paths, specializations, progress tracking, and gamification systems*

[![Website](https://img.shields.io/badge/Website-openlearn.org.in-blue?style=for-the-badge&logo=web)](https://openlearn.org.in)
[![API](https://img.shields.io/badge/API-api.openlearn.org.in-green?style=for-the-badge&logo=fastapi)](https://api.openlearn.org.in)
[![Status](https://img.shields.io/badge/Status-Production-green?style=for-the-badge)](https://api.openlearn.org.in/status/public)

### Technology Stack

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens)](https://jwt.io/)
[![AWS](https://img.shields.io/badge/AWS-SES-FF9900?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com/ses/)

</div>

## Documentation

### Quick Access
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and updates
- **[API Documentation](./docs/api/)** - Complete API reference and guides
- **[Architecture](./docs/architecture/)** - System design and technical architecture
- **[Development](./docs/development/)** - Development guides and tutorials
- **[Deployment](./docs/deployment/)** - Production deployment and CI/CD
- **[Migration](./docs/migration/)** - Platform upgrades and data migration

### Core API References
- **[Authentication API](./docs/api/AUTH_API_DOCUMENTATION.md)** - Complete authentication system
- **[Course Management](./docs/api/ADMIN_COURSE_API_DOCUMENTATION.md)** - Course and cohort administration
- **[Progress Tracking](./docs/api/PROGRESS_TRACKING_API_DOCUMENTATION.md)** - Learning progress and analytics
- **[Assignment System](./docs/api/ASSIGNMENT_MANAGEMENT_API_DOCUMENTATION.md)** - Assignment submission and grading

### Architecture Overview
- **[Complete Backend Guide](./docs/architecture/OPENLEARN_BACKEND_COMPLETE.md)** - Full system overview
- **[Authentication System](./docs/architecture/AUTH_SYSTEM_COMPLETE.md)** - Security and authentication architecture
- **[Email Service](./docs/architecture/EMAIL_SERVICE_ARCHITECTURE.md)** - Email system design and flow

## Platform Features

**Educational Structure**
- Cohort-based learning with specialized tracks
- Multi-league specializations (AI/ML, Finance, Creative, etc.)
- Week-by-week structured curriculum delivery
- Section-based content organization with progress tracking

**User Management**
- Role-based access control (Pioneers, Pathfinders, Grand Pathfinders)
- Hierarchical permission system with league-specific scoping
- Social profiles and peer interaction features
- Comprehensive user progress analytics

**Content Management**
- Multi-format resources (blogs, videos, articles, external links)
- Assignment submission and evaluation system
- Personal notes and revision marking
- Badge and achievement system

**Technical Features**
- RESTful API design with comprehensive documentation
- JWT-based authentication with refresh token rotation
- Real-time health monitoring and status pages
- Email service integration with background processing
- Docker containerization for consistent deployment

## Technical Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Dashboard]
        MOBILE[Mobile App]
        STATUS[Status Page]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx Proxy]
        EXPRESS[Express.js Server]
        AUTH_MW[Auth Middleware]
        RBAC[RBAC Middleware]
        RATE[Rate Limiting]
    end
    
    subgraph "Business Logic"
        USER_SVC[User Management]
        COHORT_SVC[Cohort Service]
        CONTENT_SVC[Content Management]
        PROGRESS_SVC[Progress Tracking]
        BADGE_SVC[Badge System]
        EMAIL_SVC[Email Service]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        AWS_SES[AWS SES]
        MONITORING[Health Monitoring]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    STATUS --> NGINX
    NGINX --> EXPRESS
    EXPRESS --> AUTH_MW
    AUTH_MW --> RBAC
    RBAC --> RATE
    
    RATE --> USER_SVC
    RATE --> COHORT_SVC
    RATE --> CONTENT_SVC
    RATE --> PROGRESS_SVC
    RATE --> BADGE_SVC
    RATE --> EMAIL_SVC
    
    USER_SVC --> POSTGRES
    COHORT_SVC --> POSTGRES
    CONTENT_SVC --> POSTGRES
    PROGRESS_SVC --> POSTGRES
    BADGE_SVC --> POSTGRES
    EMAIL_SVC --> POSTGRES
    
    EMAIL_SVC --> REDIS
    EMAIL_SVC --> AWS_SES
    EXPRESS --> REDIS
    EXPRESS --> MONITORING
    CONTENT_SVC --> FILES
    
    style POSTGRES fill:#336791,stroke:#fff,color:#fff
    style REDIS fill:#DC382D,stroke:#fff,color:#fff
    style EXPRESS fill:#000,stroke:#fff,color:#fff
    style NGINX fill:#009639,stroke:#fff,color:#fff

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

### Learning Flow Architecture

```mermaid
flowchart TD
    subgraph "Student Journey"
        START([Student Joins Cohort])
        ONBOARD[Complete Profile]
        LEAGUE[Choose Specialization League]
        WEEK[Access Weekly Content]
        SECTION[Study Sections]
        RESOURCE[Complete Resources]
        ASSIGNMENT[Submit Assignments]
        BADGE[Earn Badges]
        PROGRESS[Track Progress]
    end
    
    subgraph "Educator Workflow"
        CREATE[Create Content]
        ORGANIZE[Organize Weeks]
        REVIEW[Review Submissions]
        GRADE[Grade Assignments]
        MENTOR[Mentor Students]
    end
    
    subgraph "System Intelligence"
        ANALYTICS[Analytics Engine]
        NOTIFICATIONS[Smart Notifications]
        RECOMMENDATIONS[Content Recommendations]
        LEADERBOARD[Dynamic Leaderboards]
    end
    
    START --> ONBOARD
    ONBOARD --> LEAGUE
    LEAGUE --> WEEK
    WEEK --> SECTION
    SECTION --> RESOURCE
    RESOURCE --> ASSIGNMENT
    ASSIGNMENT --> BADGE
    BADGE --> PROGRESS
    PROGRESS --> WEEK
    
    CREATE --> ORGANIZE
    ORGANIZE --> WEEK
    ASSIGNMENT --> REVIEW
    REVIEW --> GRADE
    GRADE --> MENTOR
    
    PROGRESS --> ANALYTICS
    ANALYTICS --> NOTIFICATIONS
    ANALYTICS --> RECOMMENDATIONS
    ANALYTICS --> LEADERBOARD
    
    style START fill:#4CAF50,stroke:#fff,color:#fff
    style BADGE fill:#FF9800,stroke:#fff,color:#fff
    style ANALYTICS fill:#2196F3,stroke:#fff,color:#fff
    style CREATE fill:#9C27B0,stroke:#fff,color:#fff
```

### Database Architecture

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string olid UK "OpenLearn ID"
        string name
        UserRole role
        UserStatus status
        string institute
        string department
        int graduationYear
        string phone
        boolean emailVerified
        datetime createdAt
    }
    
    Cohort {
        string id PK
        string name
        string description
        boolean isActive
        boolean autoApproval
        datetime createdAt
    }
    
    League {
        string id PK
        string name
        string description
        string iconUrl
        datetime createdAt
    }
    
    Week {
        string id PK
        string leagueId FK
        string name
        string description
        int orderIndex
        datetime createdAt
    }
    
    Section {
        string id PK
        string weekId FK
        string name
        string description
        int orderIndex
        datetime createdAt
    }
    
    SectionResource {
        string id PK
        string sectionId FK
        string title
        string url
        ResourceType type
        int orderIndex
        datetime createdAt
    }
    
    Assignment {
        string id PK
        string leagueId FK
        string title
        string description
        datetime dueDate
        datetime createdAt
    }
    
    Badge {
        string id PK
        string leagueId FK
        string name
        string description
        string iconUrl
        string criteria
        datetime createdAt
    }
    
    User ||--o{ Enrollment : enrolls
    User ||--o{ SectionProgress : tracks
    User ||--o{ ResourceProgress : completes
    User ||--o{ UserBadge : earns
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


## Project Structure

```
openlearn-backend/
├── docs/                    # Documentation Hub
│   ├── api/                # API documentation and references
│   ├── architecture/       # System design and technical docs
│   ├── deployment/         # Production deployment guides
│   ├── development/        # Development guides and tutorials
│   └── migration/          # Platform upgrades and migrations
├── scripts/                # Utility Scripts
│   ├── deployment/         # Production deployment scripts
│   ├── development/        # Development and debugging tools
│   ├── maintenance/        # Database and system maintenance
│   └── testing/           # Automated testing scripts
├── src/                    # Source Code
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── types/             # TypeScript definitions
├── prisma/                 # Database schema and migrations
├── public/                 # Static files and status pages
├── CHANGELOG.md           # Version history
└── README.md              # This file
```

## Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    subgraph "External Layer"
        USER[Users]
        DOMAIN[openlearn.org.in]
        API_DOMAIN[api.openlearn.org.in]
    end
    
    subgraph "Security Layer"
        CF[CloudFlare]
        SSL[SSL/TLS]
        WAF[Web Application Firewall]
    end
    
    subgraph "Server Infrastructure"
        NGINX[Nginx Reverse Proxy]
        LB[Load Balancer]
        
        subgraph "Docker Environment"
            APP_CONTAINER[OpenLearn App]
            DB_CONTAINER[PostgreSQL Container]
            REDIS_CONTAINER[Redis Container]
            EMAIL_WORKER[Email Worker]
        end
    end
    
    subgraph "Monitoring & Logging"
        HEALTH[Health Checks]
        LOGS[Application Logs]
        METRICS[Performance Metrics]
        STATUS_PAGE[Status Dashboard]
    end
    
    subgraph "Cloud Services"
        AWS_SES[Amazon SES]
        STORAGE[File Storage]
        BACKUP[Database Backups]
    end
    
    USER --> DOMAIN
    USER --> API_DOMAIN
    DOMAIN --> CF
    API_DOMAIN --> CF
    CF --> SSL
    SSL --> WAF
    WAF --> NGINX
    NGINX --> LB
    LB --> APP_CONTAINER
    
    APP_CONTAINER --> DB_CONTAINER
    APP_CONTAINER --> REDIS_CONTAINER
    EMAIL_WORKER --> REDIS_CONTAINER
    EMAIL_WORKER --> AWS_SES
    
    APP_CONTAINER --> HEALTH
    APP_CONTAINER --> LOGS
    APP_CONTAINER --> METRICS
    HEALTH --> STATUS_PAGE
    
    DB_CONTAINER --> BACKUP
    APP_CONTAINER --> STORAGE
    
    style APP_CONTAINER fill:#4CAF50,stroke:#fff,color:#fff
    style DB_CONTAINER fill:#336791,stroke:#fff,color:#fff
    style REDIS_CONTAINER fill:#DC382D,stroke:#fff,color:#fff
    style NGINX fill:#009639,stroke:#fff,color:#fff
    style CF fill:#F38020,stroke:#fff,color:#fff
```

### CI/CD Pipeline

```mermaid
graph TD
    subgraph "Networking Layer"
        DOMAIN[(Domain)]
        LB[Load Balancer]
        NGINX[Nginx Proxy]
    end
    
    subgraph "Application Layer"
        DOCKER[Docker Container]
        NODE[Node.js + Express]
        APP[OpenLearn Backend]
        WORKER[Email Worker]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL 15)]
        REDIS[(Redis Cache & Queue)]
    end
    
    subgraph "Monitoring Layer"
        HEALTH[Health Checks]
        LOGS[Application Logs]
        METRICS[Performance Metrics]
        STATUS[Status Page]
    end

    subgraph "Development Environment"
        LOCAL[Local Development]
        COMPOSE[Docker Compose]
        DEV_DB[(Local PostgreSQL)]
    end
    
    subgraph "CI/CD Pipeline"
        GITHUB[GitHub Repository]
        ACTIONS[GitHub Actions]
        BUILD[Automated Build]
        DEPLOY[Auto Deploy]
    end
    
    DOMAIN --> LB
    LB --> NGINX
    NGINX --> DOCKER
    DOCKER --> NODE
    NODE --> APP
    APP --> PG
    APP --> REDIS
    APP --> HEALTH
    WORKER --> REDIS
    WORKER --> PG
    HEALTH --> STATUS
    
    LOCAL --> COMPOSE
    COMPOSE --> DEV_DB
    
    GITHUB --> ACTIONS
    ACTIONS --> BUILD
    BUILD --> DEPLOY
    DEPLOY --> DOCKER
```

### Deployment Strategy

**Production Deployment**
- **Platform**: AWS EC2 Cloud infrastructure  
- **Containerization**: Docker containers for consistency and scalability
- **Reverse Proxy**: Nginx for SSL termination
- **Database**: PostgreSQL with connection pooling
- **DNS**: Custom domain with SSL certificates (api.openlearn.org.in)
- **Email**: GoDaddy SMTP (Port 465, SSL)

**Environment Management**
```mermaid
graph LR
    DEV[Development] --> STAGING[Staging]
    STAGING --> PROD[Production]
    
    subgraph "Development"
        LOCAL_ENV[Local Environment]
        DOCKER_COMPOSE[Docker Compose]
        DEV_DB[Local PostgreSQL]
    end
    
    subgraph "Staging"
        STAGING_SERVER[Staging Server]
        STAGING_DB[Staging Database]
        E2E_TESTS[E2E Testing]
    end
    
    subgraph "Production"
        PROD_SERVER[Production Server]
        PROD_DB[Production Database]
        MONITORING[24/7 Monitoring]
    end
```

## Monitoring & Observability

Our production system includes comprehensive monitoring with real-time health checks, status updates, and alerting.

### Health Monitoring Architecture

```mermaid
graph TB
    subgraph "Health Check Scheduler"
        CRON[Node-Cron<br/>Every 5 Minutes]
        HEALTH_SERVICE[Health Check Service]
    end

    subgraph "Component Monitoring"
        API_CHECK[API Endpoint Health]
        DB_CHECK[Database Connectivity]
        AUTH_CHECK[Authentication System]
        EXTERNAL_CHECK[External Dependencies]
    end

    subgraph "Alerting & Response"
        STATUS_DB[(Status Database)]
        INCIDENT_MGT[Incident Management]
        STATUS_PAGE[Public Status Page]
        NOTIFICATIONS[Alert Notifications]
    end

    CRON --> HEALTH_SERVICE
    HEALTH_SERVICE --> API_CHECK
    HEALTH_SERVICE --> DB_CHECK
    HEALTH_SERVICE --> AUTH_CHECK
    HEALTH_SERVICE --> EXTERNAL_CHECK

    API_CHECK --> STATUS_DB
    DB_CHECK --> STATUS_DB
    AUTH_CHECK --> STATUS_DB
    EXTERNAL_CHECK --> STATUS_DB

    STATUS_DB --> INCIDENT_MGT
    INCIDENT_MGT --> STATUS_PAGE
    INCIDENT_MGT --> NOTIFICATIONS
```

### Key Features

* Real-time health checks every 5 minutes
* 24h/7d/30d uptime monitoring
* Incident alerting and logs
* [Public Status Page](https://api.openlearn.org.in/status-page)


### Container Architecture

**Docker Configuration**
```dockerfile
# Multi-stage build for optimized production images
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["npm", "start"]
```

**Container Orchestration**
- **Local Development**: Docker Compose with hot reload
- **Production**: Docker containers with health checks
- **Database**: Containerized PostgreSQL with persistent volumes
- **Caching**: Redis container for session storage


### CI/CD Pipeline

**Automated Deployment Workflow**
```mermaid
graph LR
    subgraph "Source Control"
        DEV_BRANCH[Development Branch]
        FEATURE_BRANCH[Feature Branches]
        MAIN_BRANCH[Main Branch]
    end
    
    subgraph "CI Pipeline"
        LINT[Code Linting]
        TEST[Unit Tests]
        BUILD[Build Application]
        SECURITY[Security Scan]
    end
    
    subgraph "CD Pipeline"
        STAGING_DEPLOY[Deploy to Staging]
        E2E_TEST[E2E Testing]
        PROD_DEPLOY[Deploy to Production]
        HEALTH_CHECK[Post-Deploy Health Check]
    end
    
    FEATURE_BRANCH --> LINT
    DEV_BRANCH --> LINT
    LINT --> TEST
    TEST --> BUILD
    BUILD --> SECURITY
    SECURITY --> STAGING_DEPLOY
    STAGING_DEPLOY --> E2E_TEST
    E2E_TEST --> PROD_DEPLOY
    PROD_DEPLOY --> HEALTH_CHECK
    MAIN_BRANCH --> PROD_DEPLOY
```

**Pipeline Features**
- **Automated Testing**: Unit tests, integration tests, and E2E testing
- **Code Quality**: ESLint, Prettier, and TypeScript strict mode
- **Security Scanning**: Automated vulnerability scanning
- **Database Migrations**: Automated Prisma migration deployment
- **Zero-Downtime Deployment**: Rolling updates with health checks
- **Rollback Capability**: Quick rollback on deployment failures


## Performance & Scalability

### Database
- Prisma with connection pooling
- Proper indexing and optimized queries
- Automated migrations and Prisma Studio for debugging

### Application
- Efficient memory management and garbage collection
- API rate limiting to avoid abuse
- Load tested under simulated stress

### Caching
- Redis for session and response caching
- API response-level caching for heavy requests
- Planned CDN integration for assets

### Monitoring
- Performance metrics: latency, error rates, throughput
- Alerting on thresholds via health system

## Security

OpenLearn includes multiple layers of protection across API, user access, and external interfaces.

### Security Stack

- **WAF & SSL**: Reverse-proxied through Nginx with SSL and certificate renewal
- **JWT Auth**: Secure token-based authentication with refresh rotation
- **Role-Based Access Control**: Granular permission matrix across roles
- **Helmet.js**: Default HTTP security headers
- **Validation & Sanitization**: All requests validated with express-validator
- **Rate Limiting**: Configurable thresholds for endpoints
- **Audit Logging**: User activity logs and incident traceability


### Backup & Disaster Recovery

**Backup Strategy**
- **Database Backups**: Automated daily backups with 30-day retention
- **Application Backups**: Source code versioned in Git
- **Configuration Backups**: Environment configurations and secrets
- **Log Retention**: Structured logs with configurable retention policies

**Disaster Recovery Plan**
- **RTO (Recovery Time Objective)**: < 1 hour for critical services
- **RPO (Recovery Point Objective)**: < 15 minutes for data loss
- **Failover Strategy**: Automated failover to backup infrastructure
- **Data Recovery**: Point-in-time recovery from backup snapshots

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

## API Overview

### Core Endpoints

```bash
# System Health & Status
GET  /health                         # System health check
GET  /api/status/public              # Public system status
GET  /api/status/components          # Detailed component status

# Authentication & User Management
POST /api/auth/register              # User registration
POST /api/auth/login                 # User authentication
POST /api/auth/refresh               # Token refresh
POST /api/auth/logout                # User logout
POST /api/auth/password-reset        # Password reset request
POST /api/auth/password-reset/verify # Verify OTP and reset password

# Learning Content Management
GET  /api/cohorts                    # List all cohorts
GET  /api/leagues                    # List specialization leagues
GET  /api/weeks                      # List weekly content
GET  /api/sections                   # List section content
GET  /api/resources                  # List learning resources

# Progress Tracking & Analytics
GET  /api/progress                   # User progress overview
POST /api/progress/section           # Mark section as completed
POST /api/progress/resource          # Mark resource as completed
GET  /api/analytics/counts           # Platform analytics
GET  /api/leaderboard               # Competition leaderboards

# Assignment System
GET  /api/assignments                # List assignments
POST /api/assignments/submit         # Submit assignment solution
GET  /api/assignments/:id/submissions # View submissions (educators)

# Gamification Features
GET  /api/badges                     # Available badges
GET  /api/badges/user                # User's earned badges
POST /api/social/share               # Share achievement
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as OpenLearn API
    participant DB as Database
    participant Email as Email Service
    
    Client->>API: POST /auth/register
    API->>DB: Create User Record
    API->>Email: Send Welcome Email
    API->>Client: Registration Success
    
    Client->>API: POST /auth/login
    API->>DB: Validate Credentials
    API->>Client: JWT Access + Refresh Tokens
    
    Client->>API: GET /protected-endpoint
    Note over Client,API: Authorization: Bearer {accessToken}
    API->>API: Validate JWT
    API->>Client: Protected Data
    
    Client->>API: POST /auth/refresh
    API->>API: Validate Refresh Token
    API->>Client: New Access Token
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ database
- **Redis** server (optional for development)
- **Docker** (recommended for easy setup)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/openlearn-backend.git
cd openlearn-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and service credentials

# Start PostgreSQL and Redis with Docker
docker compose up -d

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
npm run dev

# Server will be running at http://localhost:3000
```

### Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/openlearn_dev"

# JWT Security
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Service (AWS SES)
SES_REGION="eu-north-1"
SES_ACCESS_KEY_ID="your-aws-access-key"
SES_SECRET_ACCESS_KEY="your-aws-secret-key"
SES_FROM_EMAIL="info@openlearn.org.in"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# CORS and Security
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
RATE_LIMIT_WINDOW_MS="15"
RATE_LIMIT_MAX_REQUESTS="100"
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run start            # Start production server

# Database Operations
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database completely
npm run db:studio        # Open Prisma Studio

# Testing & Quality
npm run test             # Run test suites
npm run lint             # Check code style
npm run type-check       # TypeScript validation

# Docker Operations
npm run docker:dev       # Start development with Docker
npm run docker:prod      # Production Docker build
```
```bash
# Health & Status
GET  /health                    # System health check
GET  /api/status/public         # Public system status
GET  /api/status/components     # Component status details

# Public Endpoints (No Authentication Required)
GET  /api/public/cohorts-structure  # Complete cohorts → leagues → weeks structure

# Authentication
POST /api/auth/register         # User registration
POST /api/auth/login           # User login
POST /api/auth/refresh         # Token refresh
POST /api/auth/logout          # User logout

# Learning Content
GET  /api/cohorts              # List cohorts
GET  /api/leagues              # List leagues
GET  /api/weeks                # List weeks
GET  /api/sections             # List sections
GET  /api/resources            # List resources

# Progress Tracking
GET  /api/progress             # User progress
POST /api/progress/section     # Mark section complete
POST /api/progress/resource    # Mark resource complete

# Analytics (NEW)
GET  /api/analytics/counts     # Hierarchical count analytics
GET  /api/analytics/platform   # Platform overview stats
GET  /api/analytics/user/:id   # User-specific analytics

# Assignments
GET  /api/assignments          # List assignments
POST /api/assignments/submit   # Submit assignment

# Gamification
GET  /api/badges               # List badges
GET  /api/leaderboard         # Leaderboard data
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

# Amazon SES Email Configuration
SES_REGION=eu-north-1
SES_ACCESS_KEY_ID=your-aws-access-key-id
SES_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL="OpenLearn Platform" <info@openlearn.org.in>
SES_FROM_NAME=OpenLearn Platform

# Email Features
EMAIL_ENABLED=true

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

### Deployment Commands
```bash
## Production Deployment

### Live Infrastructure

- **Production Website**: [openlearn.org.in](https://openlearn.org.in)
- **API Base URL**: [api.openlearn.org.in](https://api.openlearn.org.in)
- **System Status**: [api.openlearn.org.in/status-page](https://api.openlearn.org.in/status-page)
- **Health Check**: [api.openlearn.org.in/health](https://api.openlearn.org.in/health)

### Deployment Commands

```bash
# Production build and deployment
npm run build
npm start

# Database migration in production
npx prisma migrate deploy

# Docker deployment
docker compose -f docker-compose.production.yml up -d

# Health verification
curl https://api.openlearn.org.in/health
```

## Contributing

We welcome contributions to improve the OpenLearn platform. Here's how you can help:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes following our coding standards
4. **Test** your changes thoroughly
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Coding Standards

- Follow TypeScript best practices and strict mode
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Follow the existing code style and patterns
- Update documentation when making API changes
- Ensure all tests pass before submitting

### Pull Request Guidelines

- Provide clear description of changes
- Include relevant issue numbers
- Update documentation if needed
- Ensure CI/CD pipeline passes
- Request review from maintainers

## Support & Resources

### Getting Help

- **Documentation**: Comprehensive guides in the `/docs` directory
- **Issues**: Create an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and community support
- **API Reference**: Complete API documentation in `/docs/api/`

### Project Links

- **Repository**: Current GitHub repository
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md) - Version history and updates
- **Architecture Docs**: [docs/architecture/](./docs/architecture/) - Technical architecture guides
- **API Docs**: [docs/api/](./docs/api/) - Complete API reference

### Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant logs or error messages
- Screenshots if applicable

---

<div align="center">

**Built with TypeScript, Express.js, Prisma, and PostgreSQL**

*Empowering education through technology*

**OpenLearn Platform** • **Production Ready** • **Open Source**

![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue?style=for-the-badge&logo=typescript)
![Open Source](https://img.shields.io/badge/Open-Source-green?style=for-the-badge&logo=opensource)

</div>
