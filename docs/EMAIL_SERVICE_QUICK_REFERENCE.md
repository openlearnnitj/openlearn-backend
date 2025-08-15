# Email Service Quick Reference

## 🚀 Quick Start

### 1. Configure Amazon SES
```bash
# Update .env file with SES credentials
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=your-aws-access-key-id
SES_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL="OpenLearn Platform" <noreply@openlearn.org.in>
SES_FROM_NAME=OpenLearn Platform
```

### 2. Start Services
```bash
# Start Redis and PostgreSQL
docker compose up postgres redis -d

# Start email worker (separate terminal)
npm run worker:email

# Start main server
npm run dev
```

### 3. Test SES Integration
```bash
# Run comprehensive SES tests
npm run test:ses

# Production test
npm run test:ses:prod
```

### 4. Send Test Email
```typescript
import EmailService from './services/email/EmailService';

const emailService = new EmailService();

// Simple email
await emailService.sendEmail({
  recipients: [{ id: 'user1', email: 'test@example.com', name: 'Test User' }],
  subject: 'Test Email',
  htmlContent: '<h1>Hello World!</h1>'
}, userId);

// Bulk email with template
await emailService.sendBulkEmail({
  templateId: 'welcome_email',
  roleFilter: 'PIONEER',
  subject: 'Welcome to OpenLearn!'
}, userId);
```

## 📊 Monitoring Commands

### Redis Queue Status
```bash
# Connect to Redis
docker exec -it openlearn-backend-redis-1 redis-cli

# Check queue sizes
LLEN bull:openlearn-email-queue:waiting
SMEMBERS bull:openlearn-email-queue:active
SCARD bull:openlearn-email-queue:completed
SCARD bull:openlearn-email-queue:failed
```

### Database Queries
```sql
-- Check job statuses
SELECT status, COUNT(*) FROM email_jobs GROUP BY status;

-- Recent jobs
SELECT id, subject, status, total_count, sent_count, failed_count, created_at 
FROM email_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed jobs with errors
SELECT id, subject, error_message, failed_at 
FROM email_jobs 
WHERE status = 'FAILED' 
ORDER BY failed_at DESC;
```

### API Endpoints
```bash
# Get queue statistics
GET /api/emails/queue/stats

# Get email jobs
GET /api/emails/jobs?status=COMPLETED&limit=50

# Get specific job
GET /api/emails/jobs/:jobId

# Cancel job
DELETE /api/emails/jobs/:jobId
```

## 🔧 Common Operations

### Creating Email Templates
```typescript
// Create template
await prisma.emailTemplate.create({
  data: {
    name: 'course_completion',
    subject: 'Congratulations on completing {{courseName}}!',
    htmlContent: `
      <h1>Congratulations {{userName}}!</h1>
      <p>You've completed the {{courseName}} course.</p>
      <p>Your achievement badge: {{badgeUrl}}</p>
    `,
    category: 'ACHIEVEMENT',
    variables: {
      userName: 'string',
      courseName: 'string', 
      badgeUrl: 'string'
    },
    createdById: adminUserId
  }
});
```

### Bulk Email Patterns
```typescript
// Send to all users in a cohort
await emailService.sendBulkEmail({
  templateId: 'weekly_update',
  cohortFilter: 'cohort-id',
  templateData: {
    weekNumber: 5,
    courseName: 'AI/ML Fundamentals'
  }
}, adminUserId);

// Send to specific role
await emailService.sendBulkEmail({
  templateId: 'pathfinder_report',
  roleFilter: 'PATHFINDER',
  subject: 'Weekly Pathfinder Report'
}, grandPathfinderUserId);

// Send to custom list
await emailService.sendBulkEmail({
  recipients: [
    { id: 'user1', email: 'user1@example.com', name: 'User 1' },
    { id: 'user2', email: 'user2@example.com', name: 'User 2' }
  ],
  templateId: 'custom_announcement'
}, adminUserId);
```

## 🐛 Troubleshooting

### Worker Not Processing Jobs
```bash
# Check if worker is running
ps aux | grep emailWorker

# Check worker logs
npm run worker:email

# Check Redis connection
redis-cli ping

# Restart worker
pkill -f emailWorker
npm run worker:email
```

### Jobs Stuck in Queue
```bash
# Check Redis queue
redis-cli LLEN bull:openlearn-email-queue:waiting

# Clear stalled jobs
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'bull:openlearn-email-queue:*')))" 0

# Or use QueueService
const queueService = new QueueService();
await queueService.cleanQueue();
```

### Email Sending Failures
```typescript
// Test SMTP connection
const emailService = new EmailService();
const test = await emailService.testSMTPConnection();
console.log(test); // { success: true/false, error?: string }

// Check Resend API key
console.log(process.env.RESEND_API_KEY ? 'API key present' : 'API key missing');

// Check email job errors
const failedJobs = await emailService.getEmailJobs({ status: 'FAILED' });
failedJobs.forEach(job => console.log(job.errorMessage));
```

## 📝 Development Tips

### Adding New Email Types
1. Create email template in database
2. Add template variables schema
3. Create service method for specific use case
4. Add API endpoint if needed
5. Test with small recipient list first

### Worker Development
```typescript
// Add logging to worker
console.log('Processing job:', job.data.emailJobId);
console.log('Recipients:', recipients.length);
console.log('Template:', emailJob.templateId);

// Monitor job progress
job.progress(0); // Start
job.progress(50); // Halfway
job.progress(100); // Complete
```

### Performance Optimization
```typescript
// Batch processing in worker
const BATCH_SIZE = 10;
const batches = chunk(recipients, BATCH_SIZE);

for (const batch of batches) {
  await Promise.all(batch.map(recipient => 
    this.sendToRecipient(recipient)
  ));
  
  // Small delay between batches
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

## 🔐 Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxxxxx
DATABASE_URL=postgresql://...
REDIS_URL=redis://redis:6379

# Optional
EMAIL_QUEUE_NAME=openlearn-email-queue
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=5000
EMAIL_WORKER_CONCURRENCY=5
RESEND_FROM_EMAIL="OpenLearn" <info@openlearn.org.in>
SMTP_FROM_NAME="OpenLearn Platform"
```

## 📚 Related Files

- `src/services/email/EmailService.ts` - Main email service
- `src/services/email/SMTPService.ts` - Resend integration  
- `src/services/email/QueueService.ts` - Bull queue management
- `src/services/email/TemplateService.ts` - Email templates
- `src/workers/emailWorker.ts` - Background worker
- `src/routes/emailRoutes.ts` - API endpoints
- `docs/EMAIL_SERVICE_ARCHITECTURE.md` - Complete architecture guide
