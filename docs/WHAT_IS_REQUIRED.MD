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



"summary":

so I want to make a product 
a crazy one
basically we are making a platform called openlearn for ourcollege and 
it has cohorts basically, like it is to bring a cultural shit in our college (and beyond hopefully)
so I am making the backend of the website using postgres, prisma, etc.. so I need a scalabe well though out schema foe it.
the thing is like we have two kind of people, one are pioneers and one are pathfinders
pathfinders are basicallly teachers and poineers are students, and in pathfinders there are tgrand path finder (only one) at the top, and then there are chief path finders and below then are pathfinders. I pionners there are pioneer and maybe if they perform well then we might promote them to luminary.
in courses, there is a cohort 1 this year, next year we will resgiter students in cohort 2.0
but right now people will be enrolled in cohort 1. so in cohort one, there are two "Leagues" right now (maybe more would be added in future), right now we have two leagues, AI/ML and finance, in future maybe we will add more. there can be chained leagues too, like right now, AI/ML and finance are chained, people who will be enrolled in AI/ML will enrolled in finance only (not that important). after completion they will be rewared with a specialization. pionners will have badges too, like after completion of AI/ML league they will be rewared by that badge. after completing AI/ML and finance league both they will be rewarded with a specialization (things can be coupled like this too)
so we have RBAC, (I thought that Grand pathfinder has a already registered account in the backend, manually generated, and then people coming to platform on signup page, the grand path finder will approve them manually and assign them roles, by defualt PIONEER, and can be assigned as CHIEF PATHFINDER or PATH FINDER, standard RBAC, tell if there is better way for login)
then in the courses section (which we are calling league) the pionner will se, weeks. like week1, week2.. 
and in each week would have like blogs (not arranged by days) just section-1, section-2, section3..  and each section can have bunch of links (like a list), lets say 1 blog link and 1 yt video link (agnostic) and a button on frontend that if the section is completed, a note for the section which the person can add personally, and one button if he wants to revise the section in future.
then we might want how much percent of each league is completed.
(just for knowlege, after each section completion, the person need to share it on twitter, just a redirection link there) and after each week he/she needs to add it on the linkedin (just a redireciton link on frontend)
also each pathfinders would be able to add all the course detials, and create cohorts manually.  and we need audit logs too, and basic tracking stuff.
so basically -> cohort 1 -> specialization -> league (league can be agnostic to specialization, maybe coupled to form a specialization) -> weeks -> sections. then badges of each league and batch of specialization..
make the backend easy, not to hard