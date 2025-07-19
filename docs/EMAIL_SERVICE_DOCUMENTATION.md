# OpenLearn Email Service Documentation

## Overview

The OpenLearn Email Service is a comprehensive, scalable email solution built with TypeScript, Redis, and Bull Queue. It provides **dual-template management** with file-based system templates and database-stored user templates, bulk email campaigns, and full audit logging integrated with the platform's RBAC system.

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
│ │File + DB    │ │    │                 │    │ │             │ │
│ └─────────────┘ │    │                 │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                                            │
          │              ┌─────────────────┐           │
          └──────────────▶│   PostgreSQL    │◀──────────┘
                         │   Database      │
                         └─────────────────┘
```

## Template Management System

### 🔒 Backend-Controlled Templates (File-Based)
These are **system-critical templates** stored as HTML files in `/src/templates/email/` and managed by the backend team:

- **`password-reset-otp`** - OTP delivery for password reset
- **`password-reset-success`** - Password reset confirmation
- **`email-verification`** - Email address verification
- **`account-locked`** - Account security alerts
- **`security-alert`** - System security notifications

### Frontend-Controlled Templates (Database-Stored)
These are **business and marketing templates** stored in the database and manageable by authorized users:

- **Welcome emails** for new users
- **Marketing campaigns** and newsletters
- **Course updates** and announcements
- **Achievement notifications**
- **Custom admin communications**

**Characteristics:**
- **Full CRUD operations** - Create, read, update, delete via API
- **Database storage** - Templates stored in `EmailTemplate` table
- **Real-time management** - Frontend can create and modify templates instantly
- **User ownership** - Templates linked to creator with permission controls
- **Flexible schema** - Variable schemas defined per template
- **Usage tracking** - Templates cannot be deleted if in use by email jobs

## Features

### Core Features
- **Dual Template System**: File-based system templates + database-stored user templates
- **Template Security**: System templates protected from API modification
- **Bulk Email Campaigns**: Send to users by role, cohort, league, or status
- **Queue System**: Redis-based queue with Bull for reliable background processing
- **SMTP Integration**: Configurable SMTP settings with connection testing
- **Audit Logging**: Complete audit trail for all email activities
- **Individual Email**: Send to specific users or small groups immediately
- **Scheduled Emails**: Queue emails for future delivery
- **Template Management**: Full CRUD operations for frontend-controlled templates
- **Template Preview**: Real-time preview with sample data
- **Template Duplication**: Copy existing templates as starting points
- **Variable Schema**: Dynamic variable definitions and validation
- **Analytics**: Email delivery statistics and performance metrics
- **Worker Process**: Separate worker container for email processing
- **Error Handling**: Comprehensive error tracking and retry mechanisms
- **RBAC Integration**: Role-based access control for all operations

### Template Categories
- `WELCOME`: Welcome emails for new users
- `NOTIFICATION`: System notifications and alerts
- `MARKETING`: Promotional and engagement emails
- `SYSTEM`: System-generated messages (mostly backend-controlled)
- `COURSE_UPDATE`: Course-related updates
- `ACHIEVEMENT`: Completion certificates and achievements
- `ADMIN`: Administrative communications
- `REMINDER`: Assignment and deadline reminders

## Database Models

### EmailTemplate
```sql
-- Frontend-controlled templates stored in database
- id: Primary key (UUID)
- name: Unique template identifier
- category: EmailCategory enum
- subject: Email subject with Handlebars variables
- htmlContent: HTML email body with Handlebars syntax
- textContent: Plain text fallback (optional)
- variables: JSON object defining variable schema
- description: Template description for frontend
- isActive: Template status (boolean)
- createdById: Creator user ID (foreign key)
- createdAt: Creation timestamp
- updatedAt: Last update timestamp
```

### EmailJob
```sql
- id: Primary key
- jobId: Bull queue job ID
- templateId: Optional template reference (can be system or DB template)
- templateType: 'SYSTEM' | 'DATABASE' (indicates template source)
- subject/content: Email content (for non-template emails)
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

### Send Individual Email
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
  "templateId": "welcome-pioneer", // Can be system or DB template
  "subject": "Welcome!",           // Required if no template
  "htmlContent": "<h1>Welcome</h1>", // Required if no template
  "textContent": "Welcome!",       // Optional
  "templateData": {                // Template variables
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
  "templateId": "weekly-digest",   // System or DB template
  "templateData": {
    "digest": {
      "weekPeriod": "March 1-7, 2024"
    }
  },
  "priority": 3,
  "scheduledFor": "2024-03-08T09:00:00Z" // Optional
}
```

### 🔧 Job Management

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

### Template Management

#### Get All Templates
```http
GET /api/emails/templates?category=WELCOME&isActive=true&page=1&limit=20&search=welcome
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_123",
        "name": "welcome-pioneer",
        "category": "WELCOME",
        "subject": "Welcome {{user.name}}!",
        "htmlContent": "...",
        "textContent": "...",
        "variables": {
          "user": {
            "name": { "type": "string", "required": true },
            "email": { "type": "string", "required": true }
          }
        },
        "description": "Welcome email for new pioneers",
        "isActive": true,
        "createdBy": {
          "id": "user_456",
          "name": "Admin User",
          "email": "admin@openlearn.com"
        },
        "createdAt": "2024-03-01T10:00:00Z",
        "updatedAt": "2024-03-05T14:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

#### Get Single Template
```http
GET /api/emails/templates/{templateId}
Authorization: Bearer <token>
```

#### Create Template (Frontend-Controlled Only)
```http
POST /api/emails/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom-welcome",
  "category": "WELCOME",
  "subject": "Welcome {{user.name}}!",
  "htmlContent": "<h1>Welcome {{user.name}}</h1><p>Email: {{user.email}}</p>",
  "textContent": "Welcome {{user.name}}! Email: {{user.email}}",
  "description": "Custom welcome email for pioneers",
  "variables": {
    "user": {
      "name": { "type": "string", "required": true },
      "email": { "type": "string", "required": true }
    }
  }
}
```

**Security Note:** System template names (like `password-reset-otp`) are reserved and cannot be used for new templates.

#### Update Template
```http
PUT /api/emails/templates/{templateId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Updated Welcome {{user.name}}!",
  "isActive": false,
  "description": "Updated description"
}
```

#### Delete Template
```http
DELETE /api/emails/templates/{templateId}
Authorization: Bearer <token>
```

**Protection:** Templates cannot be deleted if they are referenced by any email jobs.

#### Duplicate Template
```http
POST /api/emails/templates/{templateId}/duplicate
Authorization: Bearer <token>
Content-Type: application/json

{
  "newName": "custom-welcome-v2",
  "newDescription": "Updated version of welcome email"
}
```

#### Preview Template
```http
POST /api/emails/templates/{templateId}/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "sampleData": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subject": "Welcome John Doe!",
    "htmlContent": "<h1>Welcome John Doe</h1><p>Email: john@example.com</p>",
    "textContent": "Welcome John Doe! Email: john@example.com"
  }
}
```

#### Get Template Variables Schema
```http
GET /api/emails/templates/{templateId}/variables
Authorization: Bearer <token>
```

**Response for DB Template:**
```json
{
  "success": true,
  "data": {
    "variables": {
      "user": {
        "name": { "type": "string", "required": true },
        "email": { "type": "string", "required": true }
      }
    },
    "templateType": "DATABASE"
  }
}
```

**Response for System Template:**
```json
{
  "success": true,
  "data": {
    "variables": {
      "userName": { "type": "string", "required": true },
      "otp": { "type": "string", "required": true },
      "expiryTime": { "type": "string", "required": true },
      "expiryMinutes": { "type": "number", "required": true },
      "ipAddress": { "type": "string", "required": false }
    },
    "templateType": "SYSTEM"
  }
}
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

## Template Variables & Handlebars

### System Template Variables

Each system template has a predefined variable schema:

#### `password-reset-otp` Template
```handlebars
{{userName}}        - User's display name
{{otp}}             - 6-digit OTP code
{{expiryTime}}      - Human-readable expiry time
{{expiryMinutes}}   - Minutes until expiry (number)
{{ipAddress}}       - IP address of request (optional)
```

#### `password-reset-success` Template
```handlebars
{{userName}}        - User's display name
{{resetTime}}       - Human-readable reset time
{{loginUrl}}        - Direct login URL
{{ipAddress}}       - IP address of reset (optional)
```

#### `email-verification` Template
```handlebars
{{userName}}        - User's display name
{{verificationUrl}} - Email verification link
{{expiryTime}}      - Link expiry time
```

### Global Variables (All Templates)
```handlebars
{{app.baseUrl}}      - Application base URL
{{app.supportEmail}} - Support email address
{{app.adminEmail}}   - Admin email address
{{app.name}}         - Application name ("OpenLearn")
```

### Database Template Variables

For database templates, variables are defined in the `variables` JSON field:

```json
{
  "user": {
    "name": { "type": "string", "required": true },
    "email": { "type": "string", "required": true },
    "role": { "type": "string", "required": false }
  },
  "course": {
    "name": { "type": "string", "required": true },
    "progress": { "type": "number", "required": false }
  }
}
```

## Security & Permissions

### Template Access Control

#### System Templates (Backend-Controlled)
- **Read access**: All authenticated users can view system template schemas
- **Write access**: Cannot be created, modified, or deleted via API
- **Management**: Only backend developers with file system access

#### Database Templates (Frontend-Controlled)
- **Read access**: All authenticated users
- **Create access**: PATHFINDER role and above
- **Update access**: Template creator or PATHFINDER role
- **Delete access**: Template creator or PATHFINDER role
- **Usage protection**: Templates in use by email jobs cannot be deleted

### Rate Limiting
- **Individual emails**: 100 requests per minute
- **Bulk emails**: 5 requests per 5 minutes
- **Template operations**: Standard API rate limits apply

### Input Validation
- Template names must be unique and not conflict with system templates
- HTML content is validated for Handlebars syntax
- Variable schemas are validated for type consistency
- XSS protection through content sanitization

## 🚀 Frontend Integration Guide

### Template Management Workflow

#### 1. List Available Templates
```javascript
const response = await fetch('/api/emails/templates?category=WELCOME', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { templates } = await response.json();
```

#### 2. Create New Template
```javascript
const newTemplate = {
  name: 'welcome-pathfinder',
  category: 'WELCOME',
  subject: 'Welcome Pathfinder {{user.name}}!',
  htmlContent: '<h1>Welcome {{user.name}}</h1>...',
  variables: {
    user: {
      name: { type: 'string', required: true }
    }
  }
};

const response = await fetch('/api/emails/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newTemplate)
});
```

#### 3. Preview Template Before Saving
```javascript
const previewData = {
  sampleData: {
    user: { name: 'John Doe' }
  }
};

const response = await fetch(`/api/emails/templates/${templateId}/preview`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(previewData)
});

const { htmlContent, subject } = await response.json();
```

#### 4. Send Email Using Template
```javascript
const emailData = {
  recipients: [{ id: 'user_123', email: 'user@example.com', name: 'John Doe' }],
  templateId: 'welcome-pathfinder',
  templateData: {
    user: { name: 'John Doe' }
  }
};

const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailData)
});
```

### Error Handling

#### Template Name Conflicts
```javascript
try {
  const response = await fetch('/api/emails/templates', { ... });
  if (!response.ok) {
    const error = await response.json();
    if (error.message.includes('already exists')) {
      // Handle duplicate name
    } else if (error.message.includes('reserved')) {
      // Handle system template name conflict
    }
  }
} catch (error) {
  console.error('Template creation failed:', error);
}
```

#### Variable Validation Errors
```javascript
try {
  const response = await fetch(`/api/emails/templates/${id}/preview`, { ... });
  if (!response.ok) {
    const error = await response.json();
    if (error.message.includes('Missing required variable')) {
      // Handle missing variables in preview
    }
  }
} catch (error) {
  console.error('Preview failed:', error);
}
```

## 🔧 Development & Deployment

### Adding New System Templates

1. **Create HTML file**: Add to `/src/templates/email/new-template.html`
2. **Update service**: Add template name to `SYSTEM_TEMPLATES` set in `EmailTemplateService`
3. **Define variables**: Add variable schema to `getSystemTemplateVariables` method
4. **Test**: Create test cases for the new template

### Template File Structure
```
src/templates/email/
├── password-reset-otp.html      # OTP delivery
├── password-reset-success.html  # Reset confirmation  
├── email-verification.html      # Email verification
├── account-locked.html          # Security alerts
└── security-alert.html          # General security notifications
```

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

### Monitoring & Health Checks

#### SMTP Connection Test
```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3000/api/emails/test-smtp
```

#### Queue Health
Monitor Redis and Bull queue dashboard at:
- Bull Dashboard: `http://localhost:3000/admin/queues` (if implemented)
- Redis CLI: `redis-cli monitor`

#### Template System Health
```bash
# Check system templates loading
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/emails/templates/password-reset-otp/variables
```

### Worker Logs & Debugging

#### Worker Logs
```bash
# Development
npm run worker:email

# Production with logs
NODE_ENV=production npm run worker:email:prod 2>&1 | tee email-worker.log
```

#### Common Worker Issues

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
   - Review template variables schema