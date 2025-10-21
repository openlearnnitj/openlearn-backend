# OpenLearn Backend

<div align="center">

**A comprehensive TypeScript backend for cohort-based educational platforms**

*Modern educational platform featuring role-based learning paths, specializations, progress tracking, and gamification systems*

[![Website](https://img.shields.io/badge/Website-openlearn.org.in-blue?style=for-the-badge&logo=web)](https://openlearn.org.in)
[![API](https://img.shields.io/badge/API-api.openlearn.org.in-green?style=for-the-badge&logo=fastapi)](https://api.openlearn.org.in)
[![Status](https://img.shields.io/badge/Status-Production-green?style=for-the-badge)](https://api.openlearn.org.in/status/public)
[![Monitoring](https://img.shields.io/badge/Ops-ops.openlearn.org.in-orange?style=for-the-badge&logo=grafana)](https://ops.openlearn.org.in)

### Technology Stack

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0+-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800?style=for-the-badge&logo=grafana&logoColor=white)](https://grafana.com/)

</div>

## Live Services

- **Frontend**: [openlearn.org.in](https://openlearn.org.in) - Main platform interface
- **API**: [api.openlearn.org.in](https://api.openlearn.org.in) - REST API backend
- **Status**: [api.openlearn.org.in/status-page](https://api.openlearn.org.in/status-page) - System status dashboard
- **Monitoring**: [ops.openlearn.org.in](https://ops.openlearn.org.in) - Grafana metrics dashboard
- **Health**: [api.openlearn.org.in/health](https://api.openlearn.org.in/health) - Health check endpoint

## Documentation

### Quick Access
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and updates
- **[API Documentation](./docs/api/)** - Complete API reference and guides
- **[Architecture](./docs/architecture/)** - System design and technical architecture
- **[Development](./docs/development/)** - Development guides and tutorials
- **[Deployment](./docs/deployment/)** - Production deployment and CI/CD
- **[Monitoring](./docs/monitoring/)** - Prometheus & Grafana setup and usage

### Core API References
- **[Authentication API](./docs/api/AUTH_API_DOCUMENTATION.md)** - Complete authentication system
- **[Course Management](./docs/api/ADMIN_COURSE_API_DOCUMENTATION.md)** - Course and cohort administration
- **[Progress Tracking](./docs/api/PROGRESS_TRACKING_API_DOCUMENTATION.md)** - Learning progress and analytics
- **[Assignment System](./docs/api/ASSIGNMENT_MANAGEMENT_API_DOCUMENTATION.md)** - Assignment submission and grading

### Architecture & Operations
- **[Complete Backend Guide](./docs/architecture/OPENLEARN_BACKEND_COMPLETE.md)** - Full system overview
- **[Authentication System](./docs/architecture/AUTH_SYSTEM_COMPLETE.md)** - Security and authentication architecture
- **[Email Service](./docs/architecture/EMAIL_SERVICE_ARCHITECTURE.md)** - Email system design and flow
- **[Prometheus & Grafana Setup](./docs/monitoring/PROMETHEUS_GRAFANA_SETUP.md)** - Monitoring infrastructure guide

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
- Email service integration (Resend, Amazon SES, Mailtrap)
- Production-grade observability with Prometheus & Grafana
- Docker containerization for consistent deployment
- Automated CI/CD with GitHub Actions

## Technical Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Dashboard]
        MOBILE[Mobile App]
        STATUS[Status Page]
    end
    
    subgraph "Load Balancing & SSL"
        NGINX[Nginx Reverse Proxy]
        SSL[SSL/TLS Termination]
    end
    
    subgraph "Application Services"
        API[Express.js API]
        AUTH[Auth Middleware]
        RBAC[RBAC System]
        METRICS_MW[Metrics Middleware]
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
        POSTGRES[(PostgreSQL 15)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "Monitoring Stack"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana Dashboard]
        METRICS[/metrics Endpoint]
    end
    
    subgraph "External Services"
        RESEND[Resend API]
        AWS_SES[Amazon SES]
        MAILTRAP[Mailtrap]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    STATUS --> NGINX
    
    NGINX --> SSL
    SSL --> API
    API --> METRICS_MW
    METRICS_MW --> AUTH
    AUTH --> RBAC
    RBAC --> USER_SVC
    RBAC --> COHORT_SVC
    RBAC --> CONTENT_SVC
    RBAC --> PROGRESS_SVC
    RBAC --> BADGE_SVC
    
    USER_SVC --> POSTGRES
    COHORT_SVC --> POSTGRES
    CONTENT_SVC --> POSTGRES
    PROGRESS_SVC --> POSTGRES
    BADGE_SVC --> POSTGRES
    EMAIL_SVC --> POSTGRES
    
    API --> REDIS
    EMAIL_SVC --> REDIS
    
    EMAIL_SVC --> RESEND
    EMAIL_SVC --> AWS_SES
    EMAIL_SVC --> MAILTRAP
    
    API --> METRICS
    PROMETHEUS --> METRICS
    GRAFANA --> PROMETHEUS
    
    style POSTGRES fill:#336791,stroke:#fff,color:#fff
    style REDIS fill:#DC382D,stroke:#fff,color:#fff
    style API fill:#000,stroke:#fff,color:#fff
    style NGINX fill:#009639,stroke:#fff,color:#fff
    style PROMETHEUS fill:#E6522C,stroke:#fff,color:#fff
    style GRAFANA fill:#F46800,stroke:#fff,color:#fff
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

### Database Schema (Only Core Models)

```mermaid
erDiagram
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
    
    User {
        string id PK
        string email UK
        string olid UK
        string name
        UserRole role
        UserStatus status
        datetime createdAt
    }
    
    Cohort {
        string id PK
        string name
        string description
        boolean isActive
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
        int orderIndex
        datetime createdAt
    }
    
    Section {
        string id PK
        string weekId FK
        string name
        int orderIndex
        datetime createdAt
    }
```

## Monitoring & Observability

OpenLearn includes production-grade monitoring with Prometheus and Grafana for real-time metrics, performance tracking, and system health.

### Monitoring Architecture

```mermaid
graph LR
    subgraph "Application"
        APP[Express.js API]
        METRICS_MW[Metrics Middleware]
        METRICS_EP[/metrics Endpoint]
    end
    
    subgraph "Metrics Collection"
        PROM[Prometheus<br/>:9090]
        SCRAPE[Scrapes every 15s]
    end
    
    subgraph "Visualization"
        GRAFANA[Grafana Dashboard<br/>ops.openlearn.org.in]
        DASHBOARDS[Custom Dashboards]
    end
    
    subgraph "Metrics Types"
        HTTP[HTTP Metrics]
        DB[Database Metrics]
        AUTH[Auth Metrics]
        RATE[Rate Limit Metrics]
        NODE[Node.js Metrics]
    end
    
    APP --> METRICS_MW
    METRICS_MW --> HTTP
    METRICS_MW --> DB
    METRICS_MW --> AUTH
    METRICS_MW --> RATE
    METRICS_MW --> NODE
    
    HTTP --> METRICS_EP
    DB --> METRICS_EP
    AUTH --> METRICS_EP
    RATE --> METRICS_EP
    NODE --> METRICS_EP
    
    METRICS_EP --> SCRAPE
    SCRAPE --> PROM
    PROM --> GRAFANA
    GRAFANA --> DASHBOARDS
    
    style PROM fill:#E6522C,stroke:#fff,color:#fff
    style GRAFANA fill:#F46800,stroke:#fff,color:#fff
    style APP fill:#000,stroke:#fff,color:#fff
```

### Metrics Collected

**HTTP Metrics**
- Request duration (histogram)
- Request count by method/route/status
- In-flight requests (gauge)
- Request/response sizes
- Error rates by type

**Database Metrics**
- Query execution time (histogram)
- Query count by operation/model
- Active/idle connections
- Transaction duration
- Error rates by operation

**Authentication Metrics**
- Login attempts (success/failure)
- Token validations
- JWT errors
- Active authenticated users
- Authorization failures

**Rate Limiting Metrics**
- Rate limit hits (allowed/blocked)
- Exceeded limits by endpoint type

**Node.js Metrics** (Default)
- Heap memory usage
- Event loop lag
- CPU usage
- Garbage collection stats

### Access Monitoring

- **Grafana Dashboard**: [ops.openlearn.org.in](https://ops.openlearn.org.in)
- **Prometheus UI**: Internal only (port 9090, not publicly exposed)
- **Metrics Endpoint**: `/metrics` (protected by X-API-Secret for external access)

## Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    subgraph "External Layer"
        USER[Users]
        DOMAIN[openlearn.org.in]
        API_DOMAIN[api.openlearn.org.in]
        OPS_DOMAIN[ops.openlearn.org.in]
    end
    
    subgraph "Security & Load Balancing"
        CF[CloudFlare]
        SSL[SSL/TLS]
        NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Docker Environment"
        APP_CONTAINER[App Container<br/>:3000]
        DB_CONTAINER[PostgreSQL<br/>:5432]
        REDIS_CONTAINER[Redis<br/>:6379]
        PROM_CONTAINER[Prometheus<br/>:9090]
        GRAFANA_CONTAINER[Grafana<br/>:3001]
    end
    
    subgraph "Monitoring & Health"
        HEALTH[Health Checks]
        STATUS_PAGE[Status Dashboard]
        METRICS[Metrics Collection]
    end
    
    subgraph "External Services"
        RESEND[Resend API]
        AWS_SES[Amazon SES]
    end
    
    USER --> DOMAIN
    USER --> API_DOMAIN
    USER --> OPS_DOMAIN
    DOMAIN --> CF
    API_DOMAIN --> CF
    OPS_DOMAIN --> CF
    CF --> SSL
    SSL --> NGINX
    
    NGINX --> APP_CONTAINER
    NGINX --> GRAFANA_CONTAINER
    
    APP_CONTAINER --> DB_CONTAINER
    APP_CONTAINER --> REDIS_CONTAINER
    APP_CONTAINER --> METRICS
    
    PROM_CONTAINER --> METRICS
    GRAFANA_CONTAINER --> PROM_CONTAINER
    
    APP_CONTAINER --> HEALTH
    HEALTH --> STATUS_PAGE
    
    APP_CONTAINER --> RESEND
    APP_CONTAINER --> AWS_SES
    
    style APP_CONTAINER fill:#4CAF50,stroke:#fff,color:#fff
    style DB_CONTAINER fill:#336791,stroke:#fff,color:#fff
    style REDIS_CONTAINER fill:#DC382D,stroke:#fff,color:#fff
    style PROM_CONTAINER fill:#E6522C,stroke:#fff,color:#fff
    style GRAFANA_CONTAINER fill:#F46800,stroke:#fff,color:#fff
    style NGINX fill:#009639,stroke:#fff,color:#fff
```

### CI/CD Pipeline

```mermaid
graph TB
    subgraph "Source Control"
        PUSH[Code Push to main]
    end
    
    subgraph "GitHub Actions"
        CHECKOUT[Checkout Code]
        DEPS[Install Dependencies]
        BUILD[TypeScript Build]
        PRISMA[Generate Prisma Client]
        PACKAGE[Create Tarball]
        UPLOAD[Upload Artifact]
    end
    
    subgraph "Deployment"
        SCP[SCP to EC2]
        EXTRACT[Extract Tarball]
        REBUILD[Rebuild Native Modules]
        MIGRATE[Run Migrations]
        RESTART[Restart Containers]
    end
    
    subgraph "Verification"
        HEALTH_CHECK[Health Check]
        SMOKE_TEST[Smoke Tests]
        NOTIFY[Notify Status]
    end
    
    PUSH --> CHECKOUT
    CHECKOUT --> DEPS
    DEPS --> BUILD
    BUILD --> PRISMA
    PRISMA --> PACKAGE
    PACKAGE --> UPLOAD
    UPLOAD --> SCP
    SCP --> EXTRACT
    EXTRACT --> REBUILD
    REBUILD --> MIGRATE
    MIGRATE --> RESTART
    RESTART --> HEALTH_CHECK
    HEALTH_CHECK --> SMOKE_TEST
    SMOKE_TEST --> NOTIFY
    
    style BUILD fill:#2196F3,stroke:#fff,color:#fff
    style RESTART fill:#4CAF50,stroke:#fff,color:#fff
    style HEALTH_CHECK fill:#FF9800,stroke:#fff,color:#fff
```

### Deployment Features

**Build & Deployment**
- Builds on GitHub Actions (not on EC2 micro instance)
- Artifact-based deployment via SCP
- Native module rebuild for Alpine Linux compatibility (bcrypt)
- Automated database migrations with Prisma
- Zero-downtime deployment with health checks

**Container Strategy**
- Multi-stage Docker builds for optimized images
- Separate containers for app, database, cache, and monitoring
- Persistent volumes for data and metrics
- Health checks for all services
- Automatic restart policies

**Monitoring Persistence**
- Prometheus and Grafana remain running during app deployments
- Automatic reconnection after app container restarts
- No metrics data loss during deployments
- Independent update cycles for monitoring stack

## Security

### Security Stack

- **SSL/TLS**: HTTPS enforcement with CloudFlare
- **JWT Authentication**: Secure token-based auth with refresh rotation
- **RBAC**: Role-based access control with granular permissions
- **Helmet.js**: Security headers
- **Input Validation**: express-validator for all inputs
- **Rate Limiting**: Configurable limits per endpoint type
- **Audit Logging**: Complete user activity tracking
- **Secrets Management**: Environment-based configuration
- **Monitoring Auth**: X-API-Secret protection for /metrics endpoint

### User Roles & Permissions

**Role Hierarchy**
- **GRAND_PATHFINDER**: System administrator with full access
- **CHIEF_PATHFINDER**: Administrative role with management capabilities
- **PATHFINDER**: Educator/mentor with content creation rights
- **PIONEER**: Student/learner with progress tracking
- **LUMINARY**: Distinguished achievement role

**Permission Matrix**
```
Resource               | PIONEER | PATHFINDER | CHIEF_PATHFINDER | GRAND_PATHFINDER
--------------------- |---------|------------|------------------|------------------
View Content          |    ✓    |     ✓      |        ✓         |        ✓
Submit Assignments    |    ✓    |     ✓      |        ✓         |        ✓
Create Content        |    ✗    |     ✓      |        ✓         |        ✓
Manage Users          |    ✗    |     ✗      |        ✓         |        ✓
System Administration |    ✗    |     ✗      |        ✗         |        ✓
View Metrics          |    ✗    |     ✗      |        ✓         |        ✓
```

## API Overview

### Only Core Endpoints

```bash
# System Health & Status
GET  /health                         # Application health check
GET  /api/status/public              # Public system status
GET  /api/status/components          # Component status details
GET  /metrics                        # Prometheus metrics (protected)

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
POST /api/progress/section           # Mark section completed
POST /api/progress/resource          # Mark resource completed
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

For complete API documentation, see [docs/api/](./docs/api/)

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ database
- **Redis** server (optional for local development)
- **Docker** & Docker Compose (recommended)

### Local Development

```bash
# Clone the repository
git clone https://github.com/openlearnnitj/openlearn-backend.git
cd openlearn-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start PostgreSQL and Redis with Docker
docker compose up -d postgres redis

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run db:seed:dev

# Start development server
npm run dev

# Server will be running at http://localhost:3000
```

## Production Deployment

### Live Infrastructure

- **Frontend**: [openlearn.org.in](https://openlearn.org.in)
- **API**: [api.openlearn.org.in](https://api.openlearn.org.in)
- **Monitoring**: [ops.openlearn.org.in](https://ops.openlearn.org.in) - Grafana dashboards
- **Status**: [api.openlearn.org.in/status-page](https://api.openlearn.org.in/status-page)
- **Health**: [api.openlearn.org.in/health](https://api.openlearn.org.in/health)

### Deployment Process

**Automated via GitHub Actions:**
1. Push to `main` branch triggers CI/CD pipeline
2. Build runs on GitHub Actions runner
3. Creates deployment artifact (tarball)
4. Transfers artifact to EC2 via SCP
5. Extracts and rebuilds native modules (bcrypt for Alpine)
6. Runs database migrations
7. Restarts app container only
8. Prometheus/Grafana continue running
9. Health checks verify deployment

**Manual deployment (if needed):**
```bash
# SSH to EC2 server
ssh ubuntu@your-ec2-ip

# Navigate to project directory
cd /home/ubuntu/openlearn-backend

# Pull latest changes (or use artifact)
# Already done by GitHub Actions

# Run migrations
docker compose exec app npx prisma migrate deploy

# Restart app container
docker compose restart app

# Check health
curl http://localhost:3000/health
```

### Post-Deployment

```bash
# Verify all containers
docker compose ps

# Check logs
docker compose logs -f app

# View metrics
# Visit https://ops.openlearn.org.in

# Check Prometheus targets
# Internal only: curl http://localhost:9090/targets
```

## Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes following our coding standards
4. **Test** thoroughly
5. **Commit** (`git commit -m 'Add amazing feature'`)
6. **Push** (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Coding Standards

- Follow TypeScript best practices and strict mode
- Use meaningful names
- Add JSDoc comments for complex functions
- Update documentation for API changes
- Ensure tests pass (CI/CD checks)

## Support & Resources

### Getting Help

- **Documentation**: Comprehensive guides in [`/docs`](./docs)
- **Issues**: [GitHub Issues](https://github.com/openlearnnitj/openlearn-backend/issues)

### Project Links

- **Repository**: [github.com/openlearnnitj/openlearn-backend](https://github.com/openlearnnitj/openlearn-backend)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Architecture**: [docs/architecture/](./docs/architecture/)
- **API Docs**: [docs/api/](./docs/api/)
- **Monitoring Docs**: [docs/monitoring/](./docs/monitoring/)

---

<div align="center">

**Built with TypeScript, Express.js, Prisma, and PostgreSQL**

**Monitored with Prometheus & Grafana**

*Empowering education through technology*

**OpenLearn Platform** • **Production Ready** • **Open Source**

</div>
