# OpenLearn Backend

<div align="center">

![OpenLearn Logo](https://avatars.githubusercontent.com/u/208047818?s=200&v=4)

**A comprehensive TypeScript backend for educational platforms**

[![Website](https://img.shields.io/badge/Website-openlearn.org.in-blue?style=for-the-badge&logo=web)](ht## Contributing

We welcome contributions! Please see our contributing guidelines and:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## Support & Contact

- **Website**: [openlearn.org.in](https://openlearn.org.in)
- **Status Page**: [openlearn.org.in/status-page](https://openlearn.org.in/status-page)
- **Documentation**: Available in the `/docs` directory
- **Issues**: Create an issue in this repositoryorg.in)
[![Status](https://img.shields.io/badge/Status-Production-green?style=for-the-badge)](https://openlearn.org.in/status-page)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Live Deployment

- **Production Website**: [https://openlearn.org.in](https://openlearn.org.in)
- **System Status**: [https://openlearn.org.in/status-page](https://openlearn.org.in/status-page)
- **API Base URL**: `https://openlearn.org.in/api`
- **Health Check**: [https://openlearn.org.in/health](https://openlearn.org.in/health)

## Complete Documentation

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

## Quick Start

### Essential API Endpoints
```bash
GET  /health              # System health check
GET  /api/status          # Detailed system status
GET  /status-page         # Visual status dashboard
```

## Security Features

- **JWT Authentication** - Access tokens (15min) + refresh tokens (7 days)
- **Role-Based Access Control (RBAC)** - Hierarchical permission system
- **Input Validation & Sanitization** - express-validator with custom rules
- **Rate Limiting** - 5 req/15min for auth, 100 req/15min general
- **Password Security** - bcrypt hashing with salt rounds
- **CORS Protection** - Configurable cross-origin policies
- **Security Headers** - Helmet.js middleware
- **Database Security** - Prisma ORM with prepared statements

## Architecture Overview

### System Architecture
```mermaid
graph TB
    Client[Client Applications] --> LB[Load Balancer]
    LB --> API[Express.js API Server]
    
    API --> Auth[JWT Authentication]
    API --> Valid[Input Validation]
    API --> Rate[Rate Limiting]
    
    Auth --> DB[(PostgreSQL Database)]
    API --> Cache[(Redis Cache)]
    API --> Monitor[Health Monitoring]
    
    DB --> Prisma[Prisma ORM]
    Monitor --> Status[Status Dashboard]
    
    subgraph "Security Layer"
        Auth
        Valid
        Rate
        CORS[CORS Protection]
        Helmet[Security Headers]
    end
    
    subgraph "Data Layer"
        DB
        Cache
        Files[File Storage]
    end
```

### Technology Stack
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

### Project Structure
```
src/
├── controllers/     # Request handlers
├── middleware/      # Authentication, validation, security
├── routes/         # API route definitions
├── services/       # Business logic layer
├── utils/          # Helper functions
├── types/          # TypeScript type definitions
└── config/         # Environment configuration

prisma/
├── schema.prisma   # Database schema
├── migrations/     # Database migrations
└── seed.ts         # Database seeding

docs/              # Complete API documentation
```

### Database Schema Overview
```mermaid
erDiagram
    USER ||--o{ USER_ROLE : has
    USER ||--o{ SECTION_PROGRESS : tracks
    USER ||--o{ RESOURCE_PROGRESS : completes
    USER ||--o{ USER_BADGE : earns
    
    COHORT ||--o{ USER : contains
    COHORT ||--o{ LEAGUE : organizes
    
    LEAGUE ||--o{ SPECIALIZATION : includes
    SPECIALIZATION ||--o{ WEEK : contains
    WEEK ||--o{ SECTION : includes
    SECTION ||--o{ RESOURCE : contains
    
    RESOURCE ||--o{ ASSIGNMENT : has
    ASSIGNMENT ||--o{ SUBMISSION : receives
    
    USER {
        string id PK
        string email UK
        string name
        enum role
        datetime createdAt
        boolean emailVerified
    }
    
    SECTION_PROGRESS {
        string userId FK
        string sectionId FK
        boolean isCompleted
        datetime completedAt
    }
    
    RESOURCE {
        string id PK
        string sectionId FK
        string title
        enum type
        string content
        int estimatedDuration
    }
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Docker and Docker Compose
- PostgreSQL database
- Redis server

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd openlearn-js

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start Docker services
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/openlearn"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-token-secret"
REDIS_URL="redis://localhost:6379"
```

## System Status & Monitoring

Our production system includes comprehensive monitoring:

- **Real-time Health Checks** - Every 5 minutes across all components
- **Uptime Tracking** - 24h/7d/30d uptime statistics
- **Performance Metrics** - Response times and system resources
- **Incident Management** - Automatic issue detection and reporting
- **Keep-Alive System** - Prevents cold starts on free tier hosting

### Monitoring Architecture
```mermaid
graph LR
    HealthCheck[Health Check Scheduler] --> API[API Component]
    HealthCheck --> DB[Database Component]
    HealthCheck --> Auth[Authentication Component]
    
    API --> StatusDB[(Status Database)]
    DB --> StatusDB
    Auth --> StatusDB
    
    StatusDB --> Dashboard[Status Dashboard]
    StatusDB --> Alerts[Alert System]
    
    GitHub[GitHub Actions] --> KeepAlive[Keep-Alive Pings]
    KeepAlive --> API
```

### Monitored Components
- **API Server** - Main application endpoints
- **Database** - PostgreSQL connection and performance
- **Authentication** - JWT token validation and user sessions

## **Contributing**

We welcome contributions! Please see our contributing guidelines and:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update documentation
5. Submit a pull request

## **Support & Contact**

- **Website**: [openlearn.org.in](https://openlearn.org.in)
- **Status Page**: [openlearn.org.in/status-page](https://openlearn.org.in/status-page)
- **Documentation**: Available in the `/docs` directory
- **Issues**: Create an issue in this repository

---

<div align="center">

**Built with ❤️ for the future of education**

*OpenLearn Platform • TypeScript Backend API*

</div>

