# OpenLearn Email Service Documentation

## Overview

The OpenLearn Email Service is a comprehensive, scalable email solution built with TypeScript, Redis, and Bull Queue. It provides template-based email delivery, bulk email campaigns, and full audit logging integrated with the platform's RBAC system.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Server    │    │   Redis Queue   │    │  Email Worker   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Email Service│ │───▶│ │ Bull Queue  │ │───▶│ │SMTP Service │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │                 │    │ ┌─────────────┐ │
│ │Template Mgmt│ │    │                 │    │ │Audit Logging│ │
│ └─────────────┘ │    │                 │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                                            │
          │              ┌─────────────────┐           │
          └──────────────▶│   PostgreSQL    │◀──────────┘
                         │   Database      │
                         └─────────────────┘
```

## Features

### Core Features
- **Template System**: Handlebars-based email templates with variable substitution
- **Bulk Email Campaigns**: Send to users by role, cohort, league, or status
- **Queue System**: Redis-based queue with Bull for reliable background processing
- **SMTP Integration**: Configurable SMTP settings with connection testing
- **Audit Logging**: Complete audit trail for all email activities
- **Individual Email**: Send to specific users or small groups immediately
- **Scheduled Emails**: Queue emails for future delivery
- **Template Management**: Full CRUD operations for email templates
- **Analytics**: Email delivery statistics and performance metrics
- **Worker Process**: Separate worker container for email processing
- **Error Handling**: Comprehensive error tracking and retry mechanisms
- **RBAC Integration**: Role-based access control for all operations

### 📧 Template Categories
- `WELCOME`: Welcome emails for new users
- `NOTIFICATION`: System notifications and alerts
- `MARKETING`: Promotional and engagement emails
- `SYSTEM`: System-generated messages
- `COURSE_UPDATE`: Course-related updates
- `ACHIEVEMENT`: Completion certificates and achievements
- `ADMIN`: Administrative communications
- `REMINDER`: Assignment and deadline reminders

## Database Models

### EmailTemplate
```sql
- id: Primary key
- name: Unique template identifier
- category: EmailCategory enum
- subject: Email subject with variables
- htmlContent: HTML email body
- textContent: Plain text fallback
- variables: Array of available variables
- isActive: Template status
- createdById: Creator user ID
- timestamps: created/updated dates
```

### EmailJob
```sql
- id: Primary key
- jobId: Bull queue job ID
- templateId: Optional template reference
- subject/content: Email content
- recipientType: Type of bulk recipient
- recipients: JSON array of recipients
- status: QUEUED/PROCESSING/COMPLETED/FAILED
- priority: Queue priority (0-10)
- scheduledFor: Optional future delivery
- execution tracking: started/completed/failed timestamps
- results: sent/failed counts
```

### EmailLog
```sql
- id: Primary key
- jobId: Reference to EmailJob
- recipientId: Target user ID
- email: Recipient email address
- subject: Email subject
- status: PENDING/SENT/DELIVERED/OPENED/CLICKED/BOUNCED/FAILED
- timestamps: sent/delivered/opened/clicked/bounced dates
- error: Error message if failed
```

### EmailAuditLog
```sql
- id: Primary key
- userId: User performing action
- action: TEMPLATE_CREATED/EMAIL_SENT/BULK_EMAIL_STARTED/etc.
- description: Human-readable description
- metadata: JSON metadata
- timestamp: Action timestamp
```

## Configuration

### Environment Variables

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Service Configuration
EMAIL_FROM_NAME="OpenLearn Platform"
EMAIL_FROM_ADDRESS=noreply@openlearn.com
EMAIL_REPLY_TO=support@openlearn.com
EMAIL_SUPPORT_EMAIL=support@openlearn.com
EMAIL_ADMIN_EMAIL=admin@openlearn.com

# Queue Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EMAIL_QUEUE_NAME=openlearn-email-queue
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=5000
EMAIL_WORKER_CONCURRENCY=5

# Rate Limiting
EMAIL_RATE_LIMIT_WINDOW=60000
EMAIL_RATE_LIMIT_MAX_REQUESTS=100
EMAIL_BULK_RATE_LIMIT_WINDOW=300000
EMAIL_BULK_RATE_LIMIT_MAX_REQUESTS=5

# Application URLs
APP_BASE_URL=http://localhost:3000
```

## API Endpoints

### Email Sending

#### Send Individual Email
```http
POST /api/emails/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  ],
  "templateId": "welcome-pioneer", // Optional
  "subject": "Welcome!",           // Required if no template
  "htmlContent": "<h1>Welcome</h1>", // Required if no template
  "textContent": "Welcome!",       // Optional
  "templateData": {                // Optional template variables
    "user": {
      "name": "John Doe"
    }
  },
  "priority": 5                    // Optional (0-10)
}
```

#### Send Bulk Email
```http
POST /api/emails/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientType": "ROLE_BASED",
  "roleFilter": "PIONEER",         // Optional
  "cohortFilter": "cohort_123",    // Optional
  "leagueFilter": "league_456",    // Optional
  "statusFilter": "ACTIVE",        // Optional
  "templateId": "weekly-digest",
  "templateData": {
    "digest": {
      "weekPeriod": "March 1-7, 2024"
    }
  },
  "priority": 3,
  "scheduledFor": "2024-03-08T09:00:00Z" // Optional
}
```

### Job Management

#### Get Email Job Status
```http
GET /api/emails/jobs/{jobId}
Authorization: Bearer <token>
```

#### Get Email Jobs List
```http
GET /api/emails/jobs?status=COMPLETED&limit=10&offset=0
Authorization: Bearer <token>
```

#### Cancel Email Job
```http
POST /api/emails/jobs/{jobId}/cancel
Authorization: Bearer <token>
```

### Template Management (Admin Only)

#### Get Templates
```http
GET /api/emails/templates?category=WELCOME&isActive=true
Authorization: Bearer <token>
```

#### Create Template
```http
POST /api/emails/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom-welcome",
  "category": "WELCOME",
  "subject": "Welcome {{user.name}}!",
  "htmlContent": "<h1>Welcome {{user.name}}</h1>",
  "textContent": "Welcome {{user.name}}!",
  "description": "Custom welcome email",
  "variables": ["user.name", "user.email"],
  "isActive": true
}
```

#### Update Template
```http
PUT /api/emails/templates/{templateId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Updated Welcome {{user.name}}!",
  "isActive": false
}
```

#### Delete Template
```http
DELETE /api/emails/templates/{templateId}
Authorization: Bearer <token>
```

### Analytics & Monitoring

#### Get Email Analytics
```http
GET /api/emails/analytics?startDate=2024-03-01&endDate=2024-03-31
Authorization: Bearer <token>
```

#### Test SMTP Connection (Admin Only)
```http
GET /api/emails/test-smtp
Authorization: Bearer <token>
```

## Template Variables

Templates support Handlebars syntax with these predefined variables:

### User Variables
```handlebars
{{user.name}}        - User's display name
{{user.email}}       - User's email address
{{user.id}}          - User's unique ID
{{user.role}}        - User's role (PIONEER/PATHFINDER)
```

### Application Variables
```handlebars
{{app.baseUrl}}      - Application base URL
{{app.supportEmail}} - Support email address
{{app.adminEmail}}   - Admin email address
```

### Course Variables
```handlebars
{{course.name}}      - Course name
{{course.id}}        - Course ID
{{course.instructor}} - Course instructor
```

### Assignment Variables
```handlebars
{{assignment.title}}     - Assignment title
{{assignment.dueDate}}   - Due date
{{assignment.course}}    - Course name
{{assignment.status}}    - Assignment status
```

### Completion Variables
```handlebars
{{completion.score}}     - Final score percentage
{{completion.rank}}      - Rank in cohort
{{completion.duration}}  - Time to complete
{{completion.certificateId}} - Certificate ID
```

## Deployment

### Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your SMTP and Redis settings
```

3. **Setup Database**
```bash
npm run prisma:migrate
```

4. **Setup Email Templates**
```bash
npm run setup:email-templates
```

5. **Start Services**
```bash
# Terminal 1: Start Redis (if not using Docker)
redis-server

# Terminal 2: Start main server
npm run dev

# Terminal 3: Start email worker
npm run worker:email
```

### Production Deployment

1. **Build Application**
```bash
npm run build
```

2. **Start Services**
```bash
# Main server
npm start

# Email worker (separate process/container)
npm run worker:email:prod
```

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  email-worker:
    build: .
    command: npm run worker:email:prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: openlearn
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Monitoring & Troubleshooting

### Health Checks

#### SMTP Connection Test
```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3000/api/emails/test-smtp
```

#### Queue Health
Monitor Redis and Bull queue dashboard at:
- Bull Dashboard: `http://localhost:3000/admin/queues` (if implemented)
- Redis CLI: `redis-cli monitor`

### Common Issues

1. **SMTP Authentication Failures**
   - Verify SMTP credentials
   - Check if 2FA requires app passwords
   - Ensure SMTP server allows connections

2. **Queue Processing Delays**
   - Check Redis connectivity
   - Monitor worker process logs
   - Verify queue configuration

3. **Template Rendering Errors**
   - Validate Handlebars syntax
   - Check variable names match data
   - Review template variables array

### Logs & Debugging

#### Worker Logs
```bash
# Development
npm run worker:email

# Production with logs
NODE_ENV=production npm run worker:email:prod 2>&1 | tee email-worker.log
```

#### Database Queries
```sql
-- Check email job status
SELECT * FROM "EmailJob" WHERE status = 'PROCESSING';

-- Check recent email logs
SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 10;

-- Check audit logs
SELECT * FROM "EmailAuditLog" ORDER BY timestamp DESC LIMIT 20;
```

## Usage Examples

### Send Welcome Email
```javascript
// In your registration controller
const emailService = new EmailService();

await emailService.sendEmail({
  recipients: [{
    id: newUser.id,
    email: newUser.email,
    name: newUser.name
  }],
  templateId: newUser.role === 'PIONEER' ? 'welcome-pioneer' : 'welcome-pathfinder',
  templateData: {
    user: {
      name: newUser.name,
      email: newUser.email
    },
    app: {
      baseUrl: process.env.APP_BASE_URL,
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL
    }
  }
}, adminUserId);
```

### Send Bulk Course Update
```javascript
// Send course update to all enrolled students
await emailService.sendBulkEmail({
  recipientType: 'COHORT_BASED',
  cohortFilter: courseId,
  templateId: 'course-update',
  templateData: {
    course: {
      name: course.name,
      instructor: course.instructor
    },
    update: {
      title: 'New Module Available',
      description: 'Module 5: Advanced Topics is now available'
    }
  }
}, instructorUserId);
```

### Send Assignment Reminders
```javascript
// Send reminders for assignments due in 2 days
const upcomingAssignments = await getAssignmentsDueIn(2);

for (const assignment of upcomingAssignments) {
  await emailService.sendEmail({
    recipients: assignment.enrolledStudents.map(student => ({
      id: student.id,
      email: student.email,
      name: student.name
    })),
    templateId: 'assignment-reminder',
    templateData: {
      user: { name: '{{user.name}}' }, // Will be replaced per recipient
      assignment: {
        title: assignment.title,
        dueDate: assignment.dueDate,
        course: assignment.course.name,
        timeUntilDue: '2 days'
      }
    }
  }, systemUserId);
}
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Template management restricted to PATHFINDER role
3. **Rate Limiting**: Implemented for bulk email operations
4. **Input Validation**: All email content is sanitized
5. **Audit Logging**: Complete audit trail for compliance
6. **SMTP Security**: TLS encryption for email transport
7. **Queue Security**: Redis connection can be password-protected

## Performance Optimization

1. **Queue Concurrency**: Configurable worker concurrency
2. **Batch Processing**: Bulk emails processed in batches
3. **Template Caching**: Templates cached in memory
4. **Connection Pooling**: SMTP connection reuse
5. **Database Indexing**: Optimized queries with proper indexes
6. **Background Processing**: Non-blocking email delivery

## Support & Maintenance

For issues or questions:
1. Check the logs first (`email-worker.log`, application logs)
2. Verify configuration settings
3. Test SMTP connectivity
4. Review audit logs for debugging
5. Contact the development team with specific error messages

The email service is designed to be reliable, scalable, and maintainable. Regular monitoring and proper configuration ensure smooth operation in production environments.
