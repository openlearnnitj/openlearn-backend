# OpenLearn Backend Development - AI Agent Prompt & Roadmap

## Project Overview
You are tasked with building the backend for **OpenLearn**, an educational platform for college cohorts. The platform manages courses through "leagues" (like AI/ML, Finance) organized into cohorts, with role-based access control and progress tracking.

## Core Concept
- **Pathfinders** = Teachers (Grand → Chief → Regular hierarchy)
- **Pioneers** = Students (can become Luminaries)
- **Cohorts** = Yearly batches (Cohort 1, Cohort 2.0, etc.)
- **Leagues** = Course subjects that can combine into Specializations
- **Structure**: Cohort → Specialization → League → Week → Section → Resources

## Tech Stack Requirements
- **Database**: PostgreSQL with Prisma ORM
- **Backend**: Node.js/Express or similar
- **Authentication**: JWT-based with RBAC
- **File Storage**: Cloud storage for assignments

## Development Roadmap

### Phase 1: Database Setup & User Management (Week 1)
**Priority: HIGH**

#### Tasks:
1. **Initialize Prisma project**
   - Set up PostgreSQL connection
   - Apply the provided schema
   - Generate Prisma client

2. **User Authentication System**
   - JWT token generation/validation
   - Password hashing (bcrypt)
   - Role-based middleware

3. **User Registration & Approval Workflow**
   - Signup endpoint (creates PENDING users)
   - Grand Pathfinder approval system
   - Role assignment endpoints

#### Deliverables:
- Working database with all tables
- Auth endpoints: `/signup`, `/login`, `/approve-user`
- RBAC middleware functions

### Phase 2: Course Management System (Week 2)
**Priority: HIGH**

#### Tasks:
1. **Cohort & League Management**
   - CRUD operations for cohorts, leagues, specializations
   - Week and section management
   - Resource management (links, videos, blogs)

2. **Admin Endpoints (Pathfinder-only)**
   - Create/edit cohorts
   - Create/edit leagues and weeks
   - Manage specializations

#### Deliverables:
- Course management endpoints
- Admin-only route protection
- Data validation schemas

### Phase 3: Progress Tracking & Enrollments (Week 3)
**Priority: HIGH**

#### Tasks:
1. **Enrollment System**
   - Pioneer enrollment in cohorts/leagues
   - Progress initialization

2. **Section Progress Tracking**
   - Mark sections as complete
   - Personal notes functionality
   - Mark for revision feature
   - Progress percentage calculations

3. **Assignment System**
   - Assignment creation (one per league)
   - Submission handling (text, files, GitHub, live URLs)
   - Submission status tracking

#### Deliverables:
- Enrollment endpoints
- Progress tracking system
- Assignment submission system

### Phase 4: Achievements & Social Features (Week 4)
**Priority: MEDIUM**

#### Tasks:
1. **Badge & Specialization System**
   - Auto-award badges upon league completion
   - Specialization completion logic
   - Achievement tracking

2. **Social Sharing Integration**
   - Twitter share redirects (section completion)
   - LinkedIn share redirects (week completion)
   - Share link generation

#### Deliverables:
- Badge awarding system
- Social sharing endpoints
- Achievement APIs

### Phase 5: Analytics & Audit System (Week 5)
**Priority: MEDIUM**

#### Tasks:
1. **Audit Logging**
   - Log all important user actions
   - Track system changes
   - Admin activity monitoring

2. **Progress Analytics**
   - User progress dashboards
   - League completion rates
   - Cohort performance metrics

#### Deliverables:
- Comprehensive audit system
- Analytics endpoints
- Admin dashboard APIs

### Phase 6: Testing & Optimization (Week 6)
**Priority: HIGH**

#### Tasks:
1. **API Testing**
   - Unit tests for core functions
   - Integration tests for workflows
   - Load testing for scalability

2. **Performance Optimization**
   - Database query optimization
   - Caching implementation
   - Error handling improvements

#### Deliverables:
- Test suite with >80% coverage
- Performance benchmarks
- Production-ready deployment

## Key API Endpoints to Implement

### Authentication
```
POST /auth/signup
POST /auth/login
POST /auth/approve-user (Grand Pathfinder only)
PUT /auth/assign-role (Chief+ Pathfinders)
```

### Course Management
```
GET /cohorts
POST /cohorts (Pathfinders only)
GET /leagues
POST /leagues (Pathfinders only)
GET /leagues/:id/weeks
POST /leagues/:id/weeks (Pathfinders only)
```

### Progress & Enrollment
```
POST /enroll
GET /my-progress
PUT /sections/:id/complete
PUT /sections/:id/note
PUT /sections/:id/mark-revision
```

### Assignments
```
GET /leagues/:id/assignment
POST /assignments/:id/submit
GET /my-submissions
```

### Achievements
```
GET /my-badges
GET /my-specializations
POST /share/twitter/:sectionId
POST /share/linkedin/:weekId
```

## Technical Considerations

### Database Best Practices
- Use database transactions for complex operations
- Implement proper indexing for performance
- Add database constraints for data integrity

### Security
- Input validation on all endpoints
- Rate limiting for auth endpoints
- Secure file upload handling
- SQL injection prevention (Prisma handles this)

### Performance
- Implement caching for frequently accessed data
- Use pagination for large datasets
- Optimize N+1 queries with Prisma includes

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Detailed logging for debugging

## Success Metrics
- [ ] All CRUD operations working for core entities
- [ ] User registration → approval → enrollment flow complete
- [ ] Progress tracking with percentage calculations
- [ ] Badge/specialization auto-awarding
- [ ] Comprehensive audit logging
- [ ] API response times <200ms for most endpoints
- [ ] Test coverage >80%

## Final Notes
- Keep the API RESTful and intuitive
- Document all endpoints with proper examples
- Ensure scalability for future cohorts/leagues
- Maintain clean, readable code with proper comments
- Set up proper environment configuration for dev/prod

**Remember**: The goal is to create a robust, scalable backend that can handle the educational workflow from user registration to specialization completion, with proper role-based access and comprehensive tracking.