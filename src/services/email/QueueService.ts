import Bull from 'bull';
import IORedis from 'ioredis';
import { EmailJob, EmailJobStatus } from '@prisma/client';
import { prisma } from '../../config/database';

/**
 * Queue Service for managing email jobs using Bull queue
 * Handles email job creation, processing, and monitoring
 */
export class QueueService {
  private emailQueue: Bull.Queue;
  private redis: IORedis;

  constructor() {
    // Initialize Redis connection
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
    });

    // Initialize Bull queue
    this.emailQueue = new Bull(
      process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue',
      {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000'),
          },
        },
        settings: {
          stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
          maxStalledCount: 1,         // Max number of stalled jobs before failing
        },
      }
    );

    this.setupQueueEventListeners();
  }

  /**
   * Add an email job to the queue
   */
  async addEmailJob(emailJobData: {
    emailJobId: string;
    priority?: number;
    delay?: number;
    scheduledFor?: Date;
  }): Promise<{ success: boolean; bullJobId?: string; error?: string }> {
    try {
      const delay = emailJobData.delay || 
        (emailJobData.scheduledFor ? 
          new Date(emailJobData.scheduledFor).getTime() - Date.now() : 0);

      const bullJob = await this.emailQueue.add(
        'send-email',
        { emailJobId: emailJobData.emailJobId },
        {
          priority: emailJobData.priority || 0,
          delay: Math.max(0, delay), // Ensure delay is not negative
          jobId: `email-${emailJobData.emailJobId}`, // Unique job ID
        }
      );

      // Update email job with Bull job ID
      await prisma.emailJob.update({
        where: { id: emailJobData.emailJobId },
        data: { jobId: bullJob.id.toString() },
      });

      console.log(`Email job added to queue: ${emailJobData.emailJobId} (Bull ID: ${bullJob.id})`);

      return {
        success: true,
        bullJobId: bullJob.id.toString(),
      };
    } catch (error: any) {
      console.error('Error adding email job to queue:', error);
      return {
        success: false,
        error: error.message || 'Failed to add email job to queue',
      };
    }
  }

  /**
   * Cancel an email job
   */
  async cancelEmailJob(emailJobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
      });

      if (!emailJob) {
        return {
          success: false,
          error: 'Email job not found',
        };
      }

      if (!emailJob.jobId) {
        return {
          success: false,
          error: 'Job ID not found for email job',
        };
      }

      // Get Bull job and cancel it
      const bullJob = await this.emailQueue.getJob(emailJob.jobId);
      if (bullJob) {
        await bullJob.remove();
      }

      // Update email job status
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      console.log(`Email job cancelled: ${emailJobId}`);

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling email job:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel email job',
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(),
        this.emailQueue.getFailed(),
        this.emailQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: 0, // Bull doesn't have a direct way to get paused jobs count
      };
    } catch (error: any) {
      console.error('Error getting queue stats:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      };
    }
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<{
    isHealthy: boolean;
    redisConnected: boolean;
    queueActive: boolean;
    workerCount: number;
    error?: string;
  }> {
    try {
      // Check Redis connection
      const redisConnected = this.redis.status === 'ready';

      // Check queue status
      const queueActive = this.emailQueue && this.emailQueue.client.status === 'ready';

      // Get worker count (approximate)
      const workers = await this.emailQueue.getWorkers();
      const workerCount = workers.length;

      const isHealthy = redisConnected && queueActive;

      return {
        isHealthy,
        redisConnected,
        queueActive,
        workerCount,
      };
    } catch (error: any) {
      console.error('Error checking queue health:', error);
      return {
        isHealthy: false,
        redisConnected: false,
        queueActive: false,
        workerCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Clear completed jobs from queue
   */
  async cleanQueue(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean jobs older than 24 hours
      await this.emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days

      console.log('Queue cleaned successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error cleaning queue:', error);
      return {
        success: false,
        error: error.message || 'Failed to clean queue',
      };
    }
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupQueueEventListeners(): void {
    // Job started
    this.emailQueue.on('active', async (job: Bull.Job) => {
      console.log(`Email job started: ${job.data.emailJobId} (Bull ID: ${job.id})`);
      
      try {
        await prisma.emailJob.update({
          where: { id: job.data.emailJobId },
          data: {
            status: EmailJobStatus.PROCESSING,
            startedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Error updating job status to PROCESSING:', error);
      }
    });

    // Job completed
    this.emailQueue.on('completed', async (job: Bull.Job, result: any) => {
      console.log(`Email job completed: ${job.data.emailJobId} (Bull ID: ${job.id})`);
      
      try {
        await prisma.emailJob.update({
          where: { id: job.data.emailJobId },
          data: {
            status: EmailJobStatus.COMPLETED,
            completedAt: new Date(),
            sentCount: result.sentCount || 0,
            failedCount: result.failedCount || 0,
          },
        });
      } catch (error) {
        console.error('Error updating job status to COMPLETED:', error);
      }
    });

    // Job failed
    this.emailQueue.on('failed', async (job: Bull.Job, error: Error) => {
      console.error(`Email job failed: ${job.data.emailJobId} (Bull ID: ${job.id}):`, error);
      
      try {
        await prisma.emailJob.update({
          where: { id: job.data.emailJobId },
          data: {
            status: EmailJobStatus.FAILED,
            failedAt: new Date(),
            errorMessage: error.message,
          },
        });
      } catch (updateError) {
        console.error('Error updating job status to FAILED:', updateError);
      }
    });

    // Queue stalled
    this.emailQueue.on('stalled', (job: Bull.Job) => {
      console.warn(`Email job stalled: ${job.data.emailJobId} (Bull ID: ${job.id})`);
    });

    // Queue error
    this.emailQueue.on('error', (error: Error) => {
      console.error('Queue error:', error);
    });
  }

  /**
   * Set up email job processor for the worker
   */
  async processEmailJobs(
    processor: (job: Bull.Job<{ emailJobId: string }>) => Promise<void>
  ): Promise<void> {
    this.emailQueue.process('send-email', 
      parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5'), // Process up to 5 jobs concurrently
      processor
    );
    
    console.log('Email job processor registered');
  }

  /**
   * Get the Bull queue instance
   */
  getQueue(): Bull.Queue {
    return this.emailQueue;
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.emailQueue.close();
    await this.redis.disconnect();
  }
}

export default QueueService;
