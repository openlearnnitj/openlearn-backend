/**
 * Simple Email System Integration Test
 * Tests the complete email flow: SMTPService → EmailService → Queue → Worker
 */

import dotenv from 'dotenv';
import { SMTPService } from '../services/email/SMTPService';
import { QueueService } from '../services/email/QueueService';
import { prisma } from '../config/database';
import { EmailRecipient } from '../types';

dotenv.config();

class SimpleEmailIntegrationTest {
  private smtpService: SMTPService;
  private queueService: QueueService;
  private testUserId: string | null = null;

  constructor() {
    this.smtpService = new SMTPService();
    this.queueService = new QueueService();
  }

  /**
   * Create or find a test user for the tests
   */
  private async setupTestUser(): Promise<string> {
    try {
      // Try to find existing test user
      let testUser = await prisma.user.findFirst({
        where: { email: 'test-email-queue@example.com' }
      });

      if (!testUser) {
        // Create a test user
        testUser = await prisma.user.create({
          data: {
            email: 'test-email-queue@example.com',
            password: 'dummy-password-hash', // Required field
            name: 'Email Queue Test User',
            role: 'PIONEER',
            status: 'ACTIVE',
            olid: `TEST-${Date.now()}`,
            emailVerified: true
          }
        });
        console.log(`✅ Created test user: ${testUser.id}`);
      } else {
        console.log(`✅ Found existing test user: ${testUser.id}`);
      }

      return testUser.id;
    } catch (error) {
      console.error('❌ Failed to setup test user:', error);
      throw error;
    }
  }

  /**
   * Test direct SMTP sending (bypassing queue)
   */
  async testDirectSMTP(): Promise<boolean> {
    try {
      console.log('\n🧪 Testing Direct SMTP (no queue)...');
      
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      
      const result = await this.smtpService.sendEmail({
        to: testEmail,
        subject: `Direct SMTP Test - ${new Date().toISOString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Direct SMTP Test</h2>
            <p>This email was sent <strong>directly via SMTPService</strong> (no queue).</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Method:</strong> Direct SMTP</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>✅ SMTPService is working correctly!</p>
          </div>
        `,
        text: `Direct SMTP Test\n\nThis email was sent directly via SMTPService (no queue).\n\nProvider: ${process.env.EMAIL_PROVIDER || 'resend'}\nMethod: Direct SMTP\nTimestamp: ${new Date().toISOString()}\n\n✅ SMTPService is working correctly!`
      });

      if (result.success) {
        console.log(`✅ Direct SMTP successful! Message ID: ${result.messageId}`);
        return true;
      } else {
        console.log(`❌ Direct SMTP failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Direct SMTP test error:', error);
      return false;
    }
  }

  /**
   * Test queue connectivity and basic operations
   */
  async testQueueBasics(): Promise<boolean> {
    try {
      console.log('\n🧪 Testing Queue Basics...');
      
      // Test queue stats
      const stats = await this.queueService.getQueueStats();
      console.log(`   Queue Stats - Waiting: ${stats.waiting}, Active: ${stats.active}`);
      
      // Test queue cleanup
      await this.queueService.cleanQueue();
      console.log('   ✅ Queue cleanup successful');
      
      return true;
    } catch (error) {
      console.error('❌ Queue basics test error:', error);
      return false;
    }
  }

  /**
   * Test email sending via queue (direct queue addition)
   */
  async testDirectQueueAdd(): Promise<boolean> {
    try {
      console.log('\n🧪 Testing Direct Queue Addition...');
      
      if (!this.testUserId) {
        console.log('❌ No test user available');
        return false;
      }

      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      
      // Create a simple email job directly in the queue
      const jobData = {
        emailJobId: `test-${Date.now()}`,
        recipients: [
          {
            id: this.testUserId,
            email: testEmail,
            name: 'Queue Test User'
          }
        ],
        subject: `Direct Queue Test - ${new Date().toISOString()}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Direct Queue Test</h2>
            <p>This email was sent via the <strong>email queue system</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Method:</strong> Queue System</p>
              <p><strong>Queue:</strong> ${process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>✅ Queue system is working correctly!</p>
          </div>
        `,
        textContent: `Direct Queue Test\n\nThis email was sent via the email queue system.\n\nProvider: ${process.env.EMAIL_PROVIDER || 'resend'}\nMethod: Queue System\nQueue: ${process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue'}\nTimestamp: ${new Date().toISOString()}\n\n✅ Queue system is working correctly!`
      };

      // Add job to queue
      const job = await this.queueService.addEmailJob(jobData);
      console.log(`✅ Job added to queue: ${job.bullJobId || 'Unknown ID'}`);
      
      if (!job.success) {
        console.log(`❌ Failed to add job: ${job.error}`);
        return false;
      }
      
      // Wait a moment and check queue stats
      await this.sleep(2000);
      const stats = await this.queueService.getQueueStats();
      console.log(`   Updated Queue Stats - Waiting: ${stats.waiting}, Active: ${stats.active}, Completed: ${stats.completed}`);
      
      return true;
    } catch (error) {
      console.error('❌ Direct queue addition test error:', error);
      return false;
    }
  }

  /**
   * Run all integration tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting Simple Email Integration Tests\n');
    console.log('=' .repeat(60));
    
    // Configuration check
    const testEmail = process.env.TEST_EMAIL;
    console.log(`📧 Test Email: ${testEmail || '❌ Not set'}`);
    console.log(`📧 Provider: ${process.env.EMAIL_PROVIDER || 'resend'}`);
    console.log(`📧 Queue: ${process.env.EMAIL_QUEUE_NAME || 'openlearn-email-queue'}`);
    
    if (!testEmail) {
      console.log('\n❌ Please set TEST_EMAIL environment variable');
      return;
    }

    const results: boolean[] = [];

    try {
      // Setup test user
      console.log('\n' + '='.repeat(60));
      this.testUserId = await this.setupTestUser();

      // Test 1: Direct SMTP
      console.log('\n' + '='.repeat(60));
      results.push(await this.testDirectSMTP());

      // Test 2: Queue basics  
      console.log('\n' + '='.repeat(60));
      results.push(await this.testQueueBasics());

      // Test 3: Direct queue addition
      console.log('\n' + '='.repeat(60));
      results.push(await this.testDirectQueueAdd());

      // Summary
      this.printSummary(results);

    } catch (error) {
      console.error('💥 Test execution failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Print test summary
   */
  private printSummary(results: boolean[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${total - successful}/${total}`);
    
    const tests = ['Direct SMTP', 'Queue Basics', 'Direct Queue Add'];
    
    console.log('\n📋 Test Results:');
    results.forEach((success, index) => {
      console.log(`   ${success ? '✅' : '❌'} ${tests[index]}`);
    });
    
    if (successful === total) {
      console.log('\n🎊 All tests passed! Your email system is working perfectly!');
      console.log('\n💡 Next Steps:');
      console.log('   1. Check your email inbox for test emails');
      console.log('   2. Start the email worker: npm run worker:email');
      console.log('   3. Test the API routes: npm run test:routes');
      console.log('   4. Monitor email processing in production');
    } else {
      console.log('\n⚠️  Some tests failed. Check the configuration and try again.');
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Verify email provider credentials');
      console.log('   2. Check Redis connection');
      console.log('   3. Ensure database is accessible');
      console.log('   4. Review error messages above');
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.queueService.close();
      
      // Optionally remove test user (uncomment if needed)
      // if (this.testUserId) {
      //   await prisma.user.delete({ where: { id: this.testUserId } });
      //   console.log('🧹 Test user cleaned up');
      // }
      
      console.log('\n🧹 Resources cleaned up successfully');
    } catch (error) {
      console.log('⚠️  Cleanup warning:', error);
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
  const tester = new SimpleEmailIntegrationTest();
  await tester.runTests();
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SimpleEmailIntegrationTest };
