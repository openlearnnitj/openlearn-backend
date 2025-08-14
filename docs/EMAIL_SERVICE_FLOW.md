# Email Service Communication Flow

## 📊 Visual Flow Diagram

```
API Request
    │
    ▼
┌─────────────────┐
│  EmailService   │  1. Create job record in PostgreSQL
│   (Express)     │  2. Add job to Redis Bull queue
└─────────────────┘
    │                           
    ▼                           
┌─────────────────┐             
│   PostgreSQL    │             
│                 │  ┌─────────────────┐
│ • EmailJob      │  │     Redis       │
│   - id          │  │                 │
│   - templateId  │  │ Bull Queue:     │
│   - recipients  │  │ • waiting: []   │
│   - status      │  │ • active: []    │
│   - metadata    │  │ • completed: [] │
└─────────────────┘  │ • failed: []    │
    ▲                │                 │
    │                │ Job Data:       │
    │                │ {               │
    │                │   emailJobId    │
    │                │ }               │
    │                └─────────────────┘
    │                         │
    │                         ▼
    │                ┌─────────────────┐
    │                │  Email Worker   │
    │                │   (Background)  │
    │                │                 │
    │                │ 1. Polls Redis  │
    └────────────────│ 2. Gets job     │
                     │ 3. Fetches data │
                     │ 4. Sends emails │
                     │ 5. Updates DB   │
                     └─────────────────┘
```

## 🔄 Step-by-Step Process

### Step 1: API Request
```http
POST /api/emails/send-bulk
Content-Type: application/json

{
  "templateId": "welcome_email",
  "roleFilter": "PIONEER",
  "subject": "Welcome!"
}
```

### Step 2: EmailService Processing
```typescript
// EmailService.sendBulkEmail()
async sendBulkEmail(request, userId) {
  // Get recipients from database
  const recipients = await getRecipientsForBulkEmail(request);
  
  // Create EmailJob record in PostgreSQL
  const emailJob = await prisma.emailJob.create({
    data: {
      jobId: 'temp-id',
      templateId: request.templateId,
      subject: request.subject,
      recipients: recipients, // JSON array
      totalCount: recipients.length,
      status: 'QUEUED',
      createdById: userId
    }
  });
  
  // Add to Redis queue
  const queueResult = await queueService.addEmailJob({
    emailJobId: emailJob.id,
    priority: 0
  });
  
  return { success: true, jobId: emailJob.id };
}
```

### Step 3: Redis Queue Storage
```typescript
// QueueService.addEmailJob()
async addEmailJob(emailJobData) {
  // Add job to Bull queue (stored in Redis)
  const bullJob = await this.emailQueue.add(
    'send-email',           // Job type
    { 
      emailJobId: emailJobData.emailJobId  // Job payload
    },
    {
      priority: 0,          // Job options
      attempts: 3,
      backoff: 'exponential'
    }
  );
  
  // Update database with Bull job ID
  await prisma.emailJob.update({
    where: { id: emailJobData.emailJobId },
    data: { jobId: bullJob.id.toString() }
  });
}
```

### Step 4: Redis Data Structure
```redis
# Bull automatically creates these Redis keys:

# Job queue (list of waiting job IDs)
bull:openlearn-email-queue:waiting
[456, 457, 458]

# Active jobs (set of currently processing job IDs)  
bull:openlearn-email-queue:active
{455}

# Individual job data (hash for each job)
bull:openlearn-email-queue:456
{
  "data": '{"emailJobId":"clr123abc"}',
  "opts": '{"priority":0,"attempts":3}',
  "timestamp": 1692123456789,
  "delay": 0,
  "progress": 0
}
```

### Step 5: Worker Polling & Processing
```typescript
// emailWorker.ts - Worker startup
class EmailWorker {
  async start() {
    // Register job processor with Bull
    await this.queueService.processEmailJobs(
      this.processEmailJob.bind(this)
    );
    
    // Worker now listens for jobs from Redis
  }
}

// Bull queue processing setup
async processEmailJobs(processor) {
  this.emailQueue.process(
    'send-email',    // Job type to process
    5,               // Concurrency (5 jobs at once)
    processor        // Function to call for each job
  );
}
```

### Step 6: Job Execution
```typescript
// Called automatically by Bull when job available
async processEmailJob(job) {
  const { emailJobId } = job.data;
  
  // 1. Fetch full job details from PostgreSQL
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { template: true }
  });
  
  // 2. Update status to PROCESSING
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { 
      status: 'PROCESSING',
      startedAt: new Date()
    }
  });
  
  // 3. Process each recipient
  const recipients = emailJob.recipients as EmailRecipient[];
  let sentCount = 0;
  let failedCount = 0;
  
  for (const recipient of recipients) {
    try {
      // Render email template
      const rendered = await this.templateService.renderTemplate(
        emailJob.templateId,
        { userName: recipient.name }
      );
      
      // Send via SMTP
      const result = await this.smtpService.sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html
      });
      
      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }
      
      // Update progress
      const progress = ((sentCount + failedCount) / recipients.length) * 100;
      job.progress(progress);
      
    } catch (error) {
      failedCount++;
    }
  }
  
  // 4. Update final status
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: {
      status: sentCount > 0 ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
      sentCount,
      failedCount
    }
  });
  
  // 5. Bull automatically marks job as completed
}
```

## 🤔 Key Questions Answered

### Q: Does the queue listen to database changes?
**A: NO.** The queue does not listen to database changes. The flow is:
1. API call → EmailService creates DB record
2. EmailService → Adds job to Redis queue  
3. Worker → Polls Redis queue for jobs
4. Worker → Fetches job details from database when processing

### Q: How does the worker know about new jobs?
**A: Redis polling.** Bull automatically polls Redis for new jobs:
```typescript
// Bull internal polling (simplified)
setInterval(async () => {
  const job = await redis.brpop('bull:queue:waiting', 0); // Blocking pop
  if (job) {
    await processJob(job);
  }
}, 1000);
```

### Q: What happens if the worker crashes?
**A: Job recovery.** Bull handles worker failures:
- Jobs move from 'active' to 'stalled'
- Other workers can pick up stalled jobs
- Automatic retry with exponential backoff
- Failed jobs stored for debugging

### Q: How are jobs distributed across multiple workers?
**A: Redis-based distribution.** Multiple workers can run:
```bash
# Terminal 1
npm run worker:email

# Terminal 2  
npm run worker:email

# Terminal 3
npm run worker:email
```
Redis ensures each job is processed by only one worker.

### Q: What's stored in Redis vs PostgreSQL?

**Redis (temporary, fast):**
- Job queue state (waiting, active, completed)
- Job processing metadata
- Job progress tracking
- Retry attempts

**PostgreSQL (permanent, reliable):**
- Email job configuration and metadata
- Email templates
- Individual email send logs
- User data and recipients
- Audit trails

## 🚀 Performance Characteristics

**Queue Operations:**
- Adding job to queue: ~1ms
- Worker picking up job: ~5ms  
- Job status updates: ~2ms

**Scalability:**
- Workers: Can scale horizontally (multiple processes)
- Queue: Redis handles millions of jobs
- Database: Efficient queries with proper indexing

**Reliability:**
- Jobs persist through restarts
- Automatic retries on failure
- Dead letter queue for permanent failures
- Full audit trail in database
