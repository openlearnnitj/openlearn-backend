/**
 * Email Routes API Test Script
 * Tests email sending via HTTP endpoints (routes/controllers)
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { EmailRecipient } from '../types';

// Load environment variables
dotenv.config();

interface ApiTestResult {
  endpoint: string;
  method: string;
  success: boolean;
  message: string;
  duration?: number;
  jobId?: string;
  statusCode?: number;
}

class EmailRoutesAPITester {
  private baseUrl: string;
  private authToken: string | null = null;
  private results: ApiTestResult[] = [];

  constructor() {
    // Use environment variables or defaults for API testing
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
    console.log(`🌐 API Base URL: ${this.baseUrl}`);
  }

  /**
   * Authenticate and get JWT token
   */
  private async authenticate(): Promise<boolean> {
    try {
      console.log('\n🔐 Authenticating...');
      
      // First try to get existing test user credentials
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
      
      console.log(`   Email: ${testEmail}`);
      
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: testEmail,
        password: testPassword
      });

      if ((response.data as any).token) {
        this.authToken = (response.data as any).token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed: No token received');
        return false;
      }

    } catch (error: any) {
      console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
      
      // Try to create a test user if login failed
      try {
        console.log('🔄 Attempting to create test user...');
        
        const createResponse = await axios.post(`${this.baseUrl}/auth/register`, {
          email: process.env.TEST_USER_EMAIL || 'test@example.com',
          password: process.env.TEST_USER_PASSWORD || 'testpassword123',
          firstName: 'Test',
          lastName: 'User',
          role: 'PIONEER'
        });

        if ((createResponse.data as any).token) {
          this.authToken = (createResponse.data as any).token;
          console.log('✅ Test user created and authenticated');
          return true;
        }
      } catch (createError: any) {
        console.log('❌ Failed to create test user:', createError.response?.data?.message || createError.message);
      }
      
      return false;
    }
  }

  /**
   * Test single email sending endpoint
   */
  private async testSendEmail(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n📧 Testing POST /api/emails/send...');
      
      const recipients: EmailRecipient[] = [
        {
          id: 'test-user-1',
          email: process.env.TEST_EMAIL || 'test@example.com',
          name: 'Test User'
        }
      ];

      const emailData = {
        recipients,
        subject: `OpenLearn API Test Email - ${new Date().toISOString()}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">OpenLearn API Email Test</h2>
            <p>This email was sent via the <strong>OpenLearn API routes</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Endpoint:</strong> POST /api/emails/send</p>
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>✅ If you received this email, the API routes are working correctly!</p>
          </div>
        `,
        textContent: `OpenLearn API Email Test\n\nThis email was sent via the OpenLearn API routes.\n\nEndpoint: POST /api/emails/send\nProvider: ${process.env.EMAIL_PROVIDER || 'resend'}\nTimestamp: ${new Date().toISOString()}\n\n✅ If you received this email, the API routes are working correctly!`,
        priority: 1
      };

      const response = await axios.post(
        `${this.baseUrl}/emails/send`,
        emailData,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Email API test successful!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Job ID: ${(response.data as any).jobId || 'N/A'}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'POST /api/emails/send',
        method: 'POST',
        success: true,
        message: `Email queued successfully. Job ID: ${(response.data as any).jobId || 'N/A'}`,
        duration,
        jobId: (response.data as any).jobId,
        statusCode: response.status
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response?.data?.error || error.message;
      
      console.log(`❌ Email API test failed!`);
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'POST /api/emails/send',
        method: 'POST',
        success: false,
        message: `Error: ${errorMessage}`,
        duration,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Test bulk email sending endpoint
   */
  private async testSendBulkEmail(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n📧 Testing POST /api/emails/bulk...');
      
      const bulkEmailData = {
        recipientType: 'CUSTOM',
        recipients: [
          {
            id: 'bulk-test-1',
            email: process.env.TEST_EMAIL || 'test@example.com',
            name: 'Bulk Test User 1'
          },
          {
            id: 'bulk-test-2', 
            email: process.env.TEST_EMAIL_2 || process.env.TEST_EMAIL || 'test@example.com',
            name: 'Bulk Test User 2'
          }
        ],
        subject: `OpenLearn Bulk Email Test - ${new Date().toISOString()}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">OpenLearn Bulk Email Test</h2>
            <p>This is a <strong>bulk email</strong> sent via the OpenLearn API.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Endpoint:</strong> POST /api/emails/bulk</p>
              <p><strong>Type:</strong> Bulk Email</p>
              <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>✅ If you received this email, the bulk email API is working correctly!</p>
          </div>
        `,
        priority: 2
      };

      const response = await axios.post(
        `${this.baseUrl}/emails/bulk`,
        bulkEmailData,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Bulk email API test successful!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Job ID: ${(response.data as any).jobId || 'N/A'}`);
      console.log(`   Recipients: ${(response.data as any).estimatedRecipients || 'N/A'}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'POST /api/emails/bulk',
        method: 'POST',
        success: true,
        message: `Bulk email queued successfully. Job ID: ${(response.data as any).jobId || 'N/A'}`,
        duration,
        jobId: (response.data as any).jobId,
        statusCode: response.status
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response?.data?.error || error.message;
      
      console.log(`❌ Bulk email API test failed!`);
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'POST /api/emails/bulk',
        method: 'POST',
        success: false,
        message: `Error: ${errorMessage}`,
        duration,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Test getting email jobs
   */
  private async testGetEmailJobs(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n📋 Testing GET /api/emails/jobs...');
      
      const response = await axios.get(
        `${this.baseUrl}/emails/jobs`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Get email jobs test successful!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Jobs found: ${(response.data as any).jobs?.length || 0}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'GET /api/emails/jobs',
        method: 'GET',
        success: true,
        message: `Retrieved ${(response.data as any).jobs?.length || 0} email jobs`,
        duration,
        statusCode: response.status
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response?.data?.error || error.message;
      
      console.log(`❌ Get email jobs test failed!`);
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);

      return {
        endpoint: 'GET /api/emails/jobs',
        method: 'GET',
        success: false,
        message: `Error: ${errorMessage}`,
        duration,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Test SMTP connection endpoint
   */
  private async testSMTPConnection(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('\n🔧 Testing GET /api/emails/test-smtp...');
      
      const response = await axios.get(
        `${this.baseUrl}/emails/test-smtp`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );

      const duration = Date.now() - startTime;

      console.log(`✅ SMTP test endpoint successful!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   SMTP Status: ${(response.data as any).success ? 'Connected' : 'Failed'}`);
      console.log(`   Duration: ${duration}ms`);

      return {
        endpoint: 'GET /api/emails/test-smtp',
        method: 'GET',
        success: true,
        message: `SMTP test ${(response.data as any).success ? 'successful' : 'failed'}`,
        duration,
        statusCode: response.status
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response?.data?.error || error.message;
      
      console.log(`❌ SMTP test endpoint failed!`);
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Status: ${error.response?.status || 'N/A'}`);

      return {
        endpoint: 'GET /api/emails/test-smtp',
        method: 'GET',
        success: false,
        message: `Error: ${errorMessage}`,
        duration,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Run all API route tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting OpenLearn Email Routes API Tests\n');
    console.log('=' .repeat(60));
    
    // Check if server is running
    try {
      const healthResponse = await axios.get(`${this.baseUrl}/health`);
      console.log(`✅ Server is running (${healthResponse.status})`);
    } catch (error) {
      console.log(`❌ Server is not accessible at ${this.baseUrl}`);
      console.log('   Please ensure the OpenLearn backend server is running');
      console.log('   Try: npm run dev:server');
      return;
    }

    // Authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      console.log('   Please ensure you have valid TEST_USER_EMAIL and TEST_USER_PASSWORD in .env');
      return;
    }

    console.log('\n' + '='.repeat(60));

    // Run individual tests
    this.results.push(await this.testSMTPConnection());
    await this.sleep(1000); // Wait between tests
    
    this.results.push(await this.testSendEmail());
    await this.sleep(2000); // Wait a bit longer for email processing
    
    this.results.push(await this.testSendBulkEmail());
    await this.sleep(2000);
    
    this.results.push(await this.testGetEmailJobs());

    // Print results
    this.printResults();
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 API ROUTES TEST RESULTS');
    console.log('='.repeat(60));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`\n✅ Successful Tests: ${successful.length}`);
    console.log(`❌ Failed Tests: ${failed.length}`);
    console.log(`📈 Total Tests: ${this.results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 SUCCESSFUL TESTS:');
      successful.forEach(result => {
        console.log(`   ✅ ${result.endpoint}: ${result.message} ${result.duration ? `(${result.duration}ms)` : ''}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 FAILED TESTS:');
      failed.forEach(result => {
        console.log(`   ❌ ${result.endpoint}: ${result.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (failed.length === 0) {
      console.log('🎊 All API route tests passed! Your email routes are working perfectly!');
    } else if (successful.length > 0) {
      console.log('⚠️  Some tests failed, but others passed. Check the failed endpoints.');
    } else {
      console.log('🚨 All tests failed. Please check your server and email configuration.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Check email delivery in your test email inbox');
    console.log('   2. Monitor the queue processing with: npm run test:queue');
    console.log('   3. Check server logs for any processing errors');
    console.log('   4. Verify email worker is running: npm run worker:email');
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
    const tester = new EmailRoutesAPITester();
    await tester.runTests();
  } catch (error) {
    console.error('💥 API test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { EmailRoutesAPITester };
