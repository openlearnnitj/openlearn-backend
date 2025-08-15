/**
 * Email Queue Test Script
 * Tests the email queue system directly (QueueService + EmailWorker)
 */

import dotenv from 'dotenv';
import { EmailService } from '../services/email/EmailService';
import { QueueService } from '../services/email/QueueService';
import { EmailJobStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { EmailRecipient, SendEmailRequest } from '../types';

// Load environment variables
dotenv.config();

interface QueueTestResult {
  testName: string;
  success: boolean;
  message: string;
  duration?: number;
  jobId?: string;
  queueStats?: any;
}

class EmailQueueTester {
  private emailService: EmailService;
  private queueService: QueueService;
  private results: QueueTestResult[] = [];

  constructor() {
    this.emailService = new EmailService();
    this.queueService = new QueueService();
  }

  /**
   * Test queue connectivity and basic stats
   */
  private async testQueueConnection(): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n🔗 Testing queue connection...');
      
      // Get queue statistics
      const stats = await this.queueService.getQueueStats();
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Queue connection successful!');
      console.log(`   Waiting: ${stats.waiting}`);
      console.log(`   Active: ${stats.active}`);
      console.log(`   Completed: ${stats.completed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Duration: ${duration}ms`);
      
      return {
        testName: 'Queue Connection',
        success: true,
        message: `Connected to queue. Waiting: ${stats.waiting}, Active: ${stats.active}`,
        duration,
        queueStats: stats
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.log('❌ Queue connection failed!');
      console.log(`   Error: ${errorMessage}`);
      
      return {
        testName: 'Queue Connection',
        success: false,
        message: `Queue connection error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Test queueing a single email job
   */
  private async testQueueSingleEmail(): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n📧 Testing single email queue...');
      
      const recipients: EmailRecipient[] = [
        {
          id: 'queue-test-1',
          email: process.env.TEST_EMAIL || 'test@example.com',
          name: 'Queue Test User'
        }
      ];

      const emailRequest: SendEmailRequest = {
        recipients,
        subject: `OpenLearn Queue Test - ${new Date().toISOString()}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">OpenLearn Queue Test</h2>
            <p>This email was sent via the <strong>email queue system</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Service:</strong> EmailService → QueueService</p>
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Queue:</strong> ${process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue'}</p>
            </div>
            <p>✅ If you received this email, the queue system is working correctly!</p>
          </div>
        `,
        textContent: `OpenLearn Queue Test\n\nThis email was sent via the email queue system.\n\nService: EmailService → QueueService\nProvider: ${process.env.EMAIL_PROVIDER || 'resend'}\nTimestamp: ${new Date().toISOString()}\nQueue: ${process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue'}\n\n✅ If you received this email, the queue system is working correctly!`,
        priority: 1
      };

      // Send via EmailService (which will queue it)
      const result = await this.emailService.sendEmail(emailRequest, 'test-user-id');
      
      const duration = Date.now() - startTime;
      
      if (result.success && result.jobId) {
        console.log('✅ Email successfully queued!');
        console.log(`   Job ID: ${result.jobId}`);
        console.log(`   Recipients: ${result.estimatedRecipients}`);
        console.log(`   Duration: ${duration}ms`);
        
        return {
          testName: 'Queue Single Email',
          success: true,
          message: `Email queued successfully. Job ID: ${result.jobId}`,
          duration,
          jobId: result.jobId
        };
      } else {
        console.log('❌ Failed to queue email!');
        console.log(`   Error: ${result.error}`);
        
        return {
          testName: 'Queue Single Email',
          success: false,
          message: `Queue error: ${result.error}`,
          duration
        };
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.log('❌ Queue single email test failed!');
      console.log(`   Error: ${errorMessage}`);
      
      return {
        testName: 'Queue Single Email',
        success: false,
        message: `Error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Test queueing bulk emails
   */
  private async testQueueBulkEmail(): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n📧 Testing bulk email queue...');
      
      const recipients: EmailRecipient[] = [
        {
          id: 'bulk-queue-1',
          email: process.env.TEST_EMAIL || 'test@example.com',
          name: 'Bulk Queue User 1'
        },
        {
          id: 'bulk-queue-2',
          email: process.env.TEST_EMAIL_2 || process.env.TEST_EMAIL || 'test@example.com',
          name: 'Bulk Queue User 2'
        },
        {
          id: 'bulk-queue-3',
          email: process.env.TEST_EMAIL || 'test@example.com',
          name: 'Bulk Queue User 3'
        }
      ];

      const bulkEmailRequest = {
        recipientType: 'INDIVIDUAL' as const,
        recipients,
        subject: `OpenLearn Bulk Queue Test - ${new Date().toISOString()}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">OpenLearn Bulk Queue Test</h2>
            <p>This is a <strong>bulk email</strong> sent via the queue system.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Type:</strong> Bulk Email via Queue</p>
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Recipients:</strong> ${recipients.length}</p>
            </div>
            <p>✅ If you received this email, the bulk queue system is working!</p>
          </div>
        `,
        priority: 2
      };

      // Send via EmailService bulk method
      const result = await this.emailService.sendBulkEmail(bulkEmailRequest, 'test-user-id');
      
      const duration = Date.now() - startTime;
      
      if (result.success && result.jobId) {
        console.log('✅ Bulk email successfully queued!');
        console.log(`   Job ID: ${result.jobId}`);
        console.log(`   Recipients: ${result.estimatedRecipients}`);
        console.log(`   Duration: ${duration}ms`);
        
        return {
          testName: 'Queue Bulk Email',
          success: true,
          message: `Bulk email queued successfully. Job ID: ${result.jobId}`,
          duration,
          jobId: result.jobId
        };
      } else {
        console.log('❌ Failed to queue bulk email!');
        console.log(`   Error: ${result.error}`);
        
        return {
          testName: 'Queue Bulk Email',
          success: false,
          message: `Bulk queue error: ${result.error}`,
          duration
        };
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.log('❌ Queue bulk email test failed!');
      console.log(`   Error: ${errorMessage}`);
      
      return {
        testName: 'Queue Bulk Email',
        success: false,
        message: `Error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Monitor a queued job's progress
   */
  private async monitorQueuedJob(jobId: string, maxWaitTime: number = 30000): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n👀 Monitoring job ${jobId}...`);
      
      let jobStatus: EmailJobStatus = EmailJobStatus.QUEUED;
      let attempts = 0;
      const maxAttempts = maxWaitTime / 1000; // Check every second
      
      while (attempts < maxAttempts && 
             jobStatus !== EmailJobStatus.COMPLETED && 
             jobStatus !== EmailJobStatus.FAILED &&
             jobStatus !== EmailJobStatus.CANCELLED) {
        
        // Check job status in database
        const emailJob = await prisma.emailJob.findUnique({
          where: { id: jobId }
        });
        
        if (emailJob) {
          jobStatus = emailJob.status;
          console.log(`   Status: ${jobStatus} (attempt ${attempts + 1})`);
          
          if (jobStatus === EmailJobStatus.PROCESSING) {
            console.log('   📤 Job is being processed...');
          }
        } else {
          console.log('   ⚠️  Job not found in database');
          break;
        }
        
        attempts++;
        await this.sleep(1000);
      }
      
      const duration = Date.now() - startTime;
      
      if (jobStatus === EmailJobStatus.COMPLETED) {
        console.log('✅ Job completed successfully!');
        console.log(`   Final Status: ${jobStatus}`);
        console.log(`   Total Duration: ${duration}ms`);
        
        return {
          testName: 'Monitor Queued Job',
          success: true,
          message: `Job completed successfully in ${duration}ms`,
          duration,
          jobId
        };
      } else if (jobStatus === EmailJobStatus.FAILED) {
        console.log('❌ Job failed!');
        console.log(`   Final Status: ${jobStatus}`);
        
        return {
          testName: 'Monitor Queued Job',
          success: false,
          message: `Job failed with status: ${jobStatus}`,
          duration,
          jobId
        };
      } else {
        console.log('⏰ Job monitoring timed out');
        console.log(`   Last Status: ${jobStatus}`);
        console.log(`   Duration: ${duration}ms`);
        
        return {
          testName: 'Monitor Queued Job',
          success: false,
          message: `Job monitoring timed out. Last status: ${jobStatus}`,
          duration,
          jobId
        };
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.log('❌ Job monitoring failed!');
      console.log(`   Error: ${errorMessage}`);
      
      return {
        testName: 'Monitor Queued Job',
        success: false,
        message: `Monitoring error: ${errorMessage}`,
        duration,
        jobId
      };
    }
  }

  /**
   * Test queue cleanup
   */
  private async testQueueCleanup(): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n🧹 Testing queue cleanup...');
      
      // Get stats before cleanup
      const statsBefore = await this.queueService.getQueueStats();
      console.log(`   Before cleanup - Completed: ${statsBefore.completed}, Failed: ${statsBefore.failed}`);
      
      // Perform cleanup
      await this.queueService.cleanQueue();
      
      // Get stats after cleanup
      const statsAfter = await this.queueService.getQueueStats();
      console.log(`   After cleanup - Completed: ${statsAfter.completed}, Failed: ${statsAfter.failed}`);
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Queue cleanup completed!');
      console.log(`   Duration: ${duration}ms`);
      
      return {
        testName: 'Queue Cleanup',
        success: true,
        message: `Queue cleaned successfully. Duration: ${duration}ms`,
        duration,
        queueStats: { before: statsBefore, after: statsAfter }
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';
      
      console.log('❌ Queue cleanup failed!');
      console.log(`   Error: ${errorMessage}`);
      
      return {
        testName: 'Queue Cleanup',
        success: false,
        message: `Cleanup error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Run all queue tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting OpenLearn Email Queue Tests\n');
    console.log('=' .repeat(60));
    
    // Check basic configuration
    const testEmail = process.env.TEST_EMAIL;
    const queueName = process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue';
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    
    console.log(`📧 Test Configuration:`);
    console.log(`   Test Email: ${testEmail || '❌ Not set (set TEST_EMAIL in .env)'}`);
    console.log(`   Queue Name: ${queueName}`);
    console.log(`   Redis Host: ${redisHost}:${redisPort}`);
    console.log(`   Email Provider: ${process.env.EMAIL_PROVIDER || 'resend'}`);
    
    if (!testEmail) {
      console.log(`\n❌ Please set TEST_EMAIL in your .env file to receive test emails`);
      return;
    }

    console.log('\n' + '='.repeat(60));

    // Test queue connection first
    this.results.push(await this.testQueueConnection());
    
    if (!this.results[0].success) {
      console.log('\n❌ Cannot proceed without queue connection');
      console.log('   Please ensure Redis is running: docker compose up -d');
      return;
    }

    await this.sleep(1000);

    // Test single email queueing
    const singleEmailResult = await this.testQueueSingleEmail();
    this.results.push(singleEmailResult);

    // If single email was queued successfully, monitor it
    if (singleEmailResult.success && singleEmailResult.jobId) {
      await this.sleep(2000); // Give it a moment to start processing
      this.results.push(await this.monitorQueuedJob(singleEmailResult.jobId, 20000));
    }

    await this.sleep(3000);

    // Test bulk email queueing
    const bulkEmailResult = await this.testQueueBulkEmail();
    this.results.push(bulkEmailResult);

    // If bulk email was queued successfully, monitor it briefly
    if (bulkEmailResult.success && bulkEmailResult.jobId) {
      await this.sleep(2000);
      this.results.push(await this.monitorQueuedJob(bulkEmailResult.jobId, 15000));
    }

    await this.sleep(2000);

    // Test queue cleanup
    this.results.push(await this.testQueueCleanup());

    // Final queue stats
    console.log('\n' + '='.repeat(60));
    try {
      const finalStats = await this.queueService.getQueueStats();
      console.log('📊 Final Queue Statistics:');
      console.log(`   Waiting: ${finalStats.waiting}`);
      console.log(`   Active: ${finalStats.active}`);
      console.log(`   Completed: ${finalStats.completed}`);
      console.log(`   Failed: ${finalStats.failed}`);
    } catch (error) {
      console.log('❌ Could not retrieve final queue stats');
    }

    // Print results
    this.printResults();

    // Cleanup
    await this.cleanup();
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 QUEUE TEST RESULTS');
    console.log('='.repeat(60));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`\n✅ Successful Tests: ${successful.length}`);
    console.log(`❌ Failed Tests: ${failed.length}`);
    console.log(`📈 Total Tests: ${this.results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 SUCCESSFUL TESTS:');
      successful.forEach(result => {
        console.log(`   ✅ ${result.testName}: ${result.message} ${result.duration ? `(${result.duration}ms)` : ''}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 FAILED TESTS:');
      failed.forEach(result => {
        console.log(`   ❌ ${result.testName}: ${result.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (failed.length === 0) {
      console.log('🎊 All queue tests passed! Your email queue system is working perfectly!');
    } else if (successful.length > 0) {
      console.log('⚠️  Some tests failed, but others passed. Check the failed components.');
    } else {
      console.log('🚨 All tests failed. Please check your queue and email configuration.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Check email delivery in your test email inbox');
    console.log('   2. Ensure email worker is running: npm run worker:email');
    console.log('   3. Monitor Redis queue: redis-cli monitor');
    console.log('   4. Check server logs for processing details');
    console.log('   5. Test API routes: npm run test:routes');
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.queueService.close();
      console.log('\n🧹 Resources cleaned up');
    } catch (error) {
      console.log('\n⚠️  Cleanup warning:', error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    const tester = new EmailQueueTester();
    await tester.runTests();
  } catch (error) {
    console.error('💥 Queue test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { EmailQueueTester };
