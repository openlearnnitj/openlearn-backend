# OpenLearn Email Service Architecture Guide

## Overview

The OpenLearn email service is a sophisticated, distributed system designed to handle high-volume email sending with reliability, scalability, and monitoring. This guide explains how all components work together.

## Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Express App   │    │   Email Worker  │    │     Redis       │
│  (Main Server)  │    │   (Background)  │    │    (Queue)      │
│                 │    │                 │    │                 │
│ • API Endpoints │    │ • Job Processor │    │ • Bull Queue    │
│ • Email Service │    │ • SMTP Service  │    │ • Job Storage   │
│ • Queue Service │    │ • Template Mgmt │    │ • Job Status    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Database)    │
                    │                 │
                    │ • Email Jobs    │
                    │ • Email Logs    │
                    │ • Templates     │
                    │ • Users         │
                    └─────────────────┘
```

## 🔄 Data Flow & Communication

### 1. **Email Request Initiation**

```typescript
// User calls API endpoint
POST /api/emails/send-bulk
{
  "templateId": "welcome_email",
  "roleFilter": "PIONEER",
  "subject": "Welcome to OpenLearn!"
}
```

### 2. **Email Service Processing**

```typescript
// EmailService.sendBulkEmail()
const emailService = new EmailService();
const result = await emailService.sendBulkEmail(request, userId);

// 1. Get recipients from database based on filters
const recipients = await getRecipientsForBulkEmail(request);

// 2. Create EmailJob record in PostgreSQL
const emailJob = await prisma.emailJob.create({
  data: {
    jobId: "email-1692123456789-abc123",
    templateId: request.templateId,
    subject: "Welcome to OpenLearn!",
    recipients: recipients, // JSON array of recipient objects
    totalCount: recipients.length,
    status: "QUEUED",
    createdById: userId
  }
});

// 3. Add job to Redis queue via QueueService
const queueResult = await queueService.addEmailJob({
  emailJobId: emailJob.id,
  priority: 0
});
```

### 3. **Redis Queue Mechanics**

The queue **does NOT** listen to database changes. Instead:

**❌ Common Misconception:**
```
Database → Triggers → Redis Queue  (This doesn't happen)
```

**✅ Actual Flow:**
```
API Request → EmailService → Database Record → Redis Queue
```

**How it actually works:**

```typescript
// QueueService.addEmailJob()
async addEmailJob(emailJobData) {
  // 1. Add job to Bull queue (Redis)
  const bullJob = await this.emailQueue.add(
    'send-email',
    { emailJobId: emailJobData.emailJobId },
    {
      priority: emailJobData.priority || 0,
      delay: emailJobData.delay || 0,
      jobId: `email-${emailJobData.emailJobId}`
    }
  );

  // 2. Update database with Bull job ID for tracking
  await prisma.emailJob.update({
    where: { id: emailJobData.emailJobId },
    data: { jobId: bullJob.id.toString() }
  });
}
```

### 4. **Redis Queue Storage**

Redis stores the queue data in specific data structures:

```redis
# Bull queue data structure in Redis:
bull:openlearn-email-queue:waiting         # List of waiting jobs
bull:openlearn-email-queue:active          # Set of active jobs
bull:openlearn-email-queue:completed       # Set of completed jobs
bull:openlearn-email-queue:failed          # Set of failed jobs
bull:openlearn-email-queue:id              # Job ID counter
bull:openlearn-email-queue:123             # Individual job data (hash)
```

### 5. **Email Worker Processing**

The worker runs as a **separate Node.js process**:

```bash
# Start email worker (separate from main server)
npm run worker:email
# OR in production
npm run worker:email:prod
```

**Worker Process Flow:**

```typescript
// emailWorker.ts
class EmailWorker {
  async start() {
    // 1. Connect to same Redis instance
    this.queueService = new QueueService();
    
    // 2. Register job processor
    await this.queueService.processEmailJobs(this.processEmailJob.bind(this));
    
    // 3. Worker now waits for jobs from Redis
  }

  async processEmailJob(job: Job<{emailJobId: string}>) {
    const { emailJobId } = job.data;
    
    // 1. Fetch job details from PostgreSQL
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
      include: { template: true }
    });

    // 2. Update status to PROCESSING
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'PROCESSING', startedAt: new Date() }
    });

    // 3. Process each recipient
    const recipients = emailJob.recipients as EmailRecipient[];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // Render template for this recipient
        const rendered = await this.templateService.renderTemplate(
          emailJob.templateId,
          { userName: recipient.name }
        );

        // Send email via SMTP
        const result = await this.smtpService.sendEmail({
          to: recipient.email,
          subject: rendered.subject,
          html: rendered.html
        });

        if (result.success) {
          sentCount++;
          // Log to EmailLog table
          await this.logEmailSent(recipient.id, 'SENT');
        } else {
          failedCount++;
          await this.logEmailSent(recipient.id, 'FAILED', result.error);
        }
      } catch (error) {
        failedCount++;
        await this.logEmailSent(recipient.id, 'FAILED', error.message);
      }
    }

    // 4. Update final job status
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: sentCount > 0 ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        sentCount,
        failedCount
      }
    });
  }
}
```

## 🐳 Docker Setup & Communication

### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/openlearn
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    # Stores: EmailJob, EmailLog, EmailTemplate, User data

  redis:
    image: redis:7-alpine
    # Stores: Bull queue data, job states, job progress
```

### Network Communication

```
┌─────────────────┐     ┌─────────────────┐
│   Express App   │────▶│     Redis       │
│   (Port 3000)   │     │   (Port 6379)   │
│                 │     │                 │
│ Adds jobs to    │     │ • Job queue     │
│ Redis queue     │     │ • Job status    │
└─────────────────┘     │ • Job results   │
         │               └─────────────────┘
         │                        ▲
         ▼                        │
┌─────────────────┐               │
│   PostgreSQL    │               │
│   (Port 5432)   │               │
│                 │               │
│ • Email metadata│               │
│ • User data     │               │
│ • Job records   │               │
└─────────────────┘               │
         ▲                        │
         │                        │
         └────────────────────────┼──────┐
                                  │      │
                      ┌─────────────────┐│
                      │  Email Worker   ││
                      │  (Background)   ││
                      │                 ││
                      │ • Reads Redis   ││
                      │ • Updates DB    │┘
                      │ • Sends emails  │
                      └─────────────────┘
```

## 🔄 Message Flow Breakdown

### Step-by-Step Process

1. **API Call** (Express App)
   ```http
   POST /api/emails/send-bulk
   ```

2. **EmailService.sendBulkEmail()** (Express App)
   ```typescript
   // Get recipients from database
   const recipients = await getRecipientsForBulkEmail(filters);
   
   // Create job record in PostgreSQL
   const emailJob = await prisma.emailJob.create({...});
   ```

3. **QueueService.addEmailJob()** (Express App)
   ```typescript
   // Add to Redis Bull queue
   const bullJob = await this.emailQueue.add('send-email', {
     emailJobId: emailJob.id
   });
   ```

4. **Redis Storage** (Redis Container)
   ```redis
   # Job stored in Redis with structure:
   {
     "id": "123",
     "data": { "emailJobId": "clr123abc" },
     "opts": { "priority": 0 },
     "timestamp": 1692123456789
   }
   ```

5. **Worker Picks Up Job** (Email Worker Process)
   ```typescript
   // Bull automatically calls this when job available
   async processEmailJob(job) {
     const emailJob = await prisma.emailJob.findUnique({
       where: { id: job.data.emailJobId }
     });
     // Process emails...
   }
   ```

6. **SMTP Sending** (Email Worker)
   ```typescript
   // For each recipient
   await this.smtpService.sendEmail({
     to: recipient.email,
     subject: renderedSubject,
     html: renderedHtml
   });
   ```

7. **Status Updates** (Email Worker → PostgreSQL)
   ```typescript
   // Update job status
   await prisma.emailJob.update({
     data: { 
       status: 'COMPLETED',
       sentCount: 150,
       failedCount: 5
     }
   });
   ```

## 📊 Data Storage Strategy

### PostgreSQL Tables

```sql
-- Job metadata and configuration
CREATE TABLE email_jobs (
  id TEXT PRIMARY KEY,
  job_id TEXT UNIQUE,          -- Bull job ID for cross-reference
  template_id TEXT,
  subject TEXT,
  html_content TEXT,
  recipients JSONB,            -- Array of recipient objects
  total_count INTEGER,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status EMAIL_JOB_STATUS,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Individual email send logs
CREATE TABLE email_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES email_jobs(id),
  recipient_id TEXT REFERENCES users(id),
  email TEXT,
  subject TEXT,
  status EMAIL_STATUS,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error TEXT,
  message_id TEXT             -- SMTP provider message ID
);
```

### Redis Data Structure

```redis
# Bull Queue Keys (examples)
bull:openlearn-email-queue:waiting        # List: [job1, job2, job3]
bull:openlearn-email-queue:active         # Set: {job4, job5}
bull:openlearn-email-queue:completed      # Set: {job6, job7}
bull:openlearn-email-queue:failed         # Set: {job8}
bull:openlearn-email-queue:stalled        # Set: {}

# Individual Job Data
bull:openlearn-email-queue:123            # Hash with job details
{
  "data": '{"emailJobId":"clr123abc"}',
  "opts": '{"priority":0,"delay":0}',
  "progress": 0,
  "returnvalue": null,
  "stacktrace": null,
  "timestamp": 1692123456789
}
```

## 🔧 Configuration & Environment

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost          # Redis container host
REDIS_PORT=6379              # Redis port
REDIS_PASSWORD=              # Optional Redis password
REDIS_URL=redis://redis:6379 # Full Redis URL

# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxx # Resend API key
RESEND_FROM_EMAIL="OpenLearn Platform" <info@openlearn.org.in>
SMTP_FROM_NAME="OpenLearn Platform"

# Queue Configuration
EMAIL_QUEUE_NAME=openlearn-email-queue
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=5000
EMAIL_WORKER_CONCURRENCY=5

# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/openlearn
```

### Worker Scripts in package.json

```json
{
  "scripts": {
    "worker:email": "ts-node src/workers/emailWorker.ts",
    "worker:email:prod": "node dist/workers/emailWorker.js"
  }
}
```

## 🚀 Starting the System

### Development Mode

```bash
# Terminal 1: Start database and Redis
docker compose up postgres redis

# Terminal 2: Start main server
npm run dev

# Terminal 3: Start email worker
npm run worker:email
```

### Production Mode

```bash
# Start all services
docker compose up -d

# The main app container includes the email worker
# Or run worker separately:
npm run worker:email:prod
```

## 🔍 Monitoring & Debugging

### Queue Monitoring

```typescript
// Get queue statistics
const stats = await queueService.getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 0
// }

// Health check
const health = await queueService.getQueueHealth();
console.log(health);
// {
//   isHealthy: true,
//   redisConnected: true,
//   queueActive: true,
//   workerCount: 1
// }
```

### Job Status Tracking

```typescript
// Check specific job status
const emailJob = await emailService.getEmailJob(jobId);
console.log(emailJob.status); // QUEUED, PROCESSING, COMPLETED, FAILED

// Get all jobs
const jobs = await emailService.getEmailJobs({
  status: 'COMPLETED',
  limit: 50
});
```

### Redis CLI Debugging

```bash
# Connect to Redis container
docker exec -it openlearn-backend-redis-1 redis-cli

# Check queue contents
LLEN bull:openlearn-email-queue:waiting
SMEMBERS bull:openlearn-email-queue:active
SMEMBERS bull:openlearn-email-queue:completed

# View specific job
HGETALL bull:openlearn-email-queue:123
```

## 🛡️ Error Handling & Reliability

### Retry Mechanism

```typescript
// Bull queue retry configuration
defaultJobOptions: {
  attempts: 3,                    // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',         // Exponential backoff
    delay: 5000                  // Start with 5 second delay
  }
}

// Retry delays: 5s → 25s → 125s → fail permanently
```

### Error Recovery

```typescript
// Job failure handling in worker
this.emailQueue.on('failed', async (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
  
  // Update database status
  await prisma.emailJob.update({
    where: { id: job.data.emailJobId },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      errorMessage: error.message
    }
  });
  
  // Send alert to admins if needed
  await this.sendFailureAlert(job, error);
});
```

### Graceful Shutdown

```typescript
// Worker shutdown handling
process.on('SIGTERM', async () => {
  console.log('Shutting down email worker...');
  
  // Stop accepting new jobs
  this.isShuttingDown = true;
  
  // Wait for current jobs to complete
  await this.queueService.getQueue().close();
  
  // Close connections
  await this.emailService.close();
  
  process.exit(0);
});
```

## 🎯 Key Architectural Benefits

1. **Scalability**: Workers can be scaled independently
2. **Reliability**: Jobs persist in Redis, survive restarts
3. **Monitoring**: Full visibility into queue status and job progress
4. **Fault Tolerance**: Automatic retries with exponential backoff
5. **Performance**: Non-blocking API responses, background processing
6. **Flexibility**: Easy to add more worker types or modify processing logic

## 📋 Summary

The email service architecture uses:

- **PostgreSQL**: Persistent storage for job metadata, user data, and email logs
- **Redis**: Fast, in-memory queue storage for job distribution
- **Bull**: Queue management library that handles job lifecycle
- **Express App**: Creates jobs and manages API endpoints
- **Email Worker**: Background process that actually sends emails
- **SMTP Service**: Handles email delivery via Resend API

The communication flow is **unidirectional** and **event-driven**:
1. API → Database record creation
2. Database → Redis queue job creation  
3. Redis → Worker job processing
4. Worker → Database status updates
5. Worker → SMTP email sending

This design ensures **reliability**, **scalability**, and **observability** for high-volume email operations.
