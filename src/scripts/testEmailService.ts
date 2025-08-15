/**
 * Comprehensive Email Service Test Script
 * Tests modular email service with provider switching functionality
 */

import dotenv from 'dotenv';
import { SMTPService } from '../services/email/SMTPService';

// Load environment variables
dotenv.config();

interface TestResult {
  provider: string;
  success: boolean;
  message: string;
  duration?: number;
}

class EmailServiceTester {
  private results: TestResult[] = [];

  /**
   * Test email sending with a specific provider
   */
  private async testProvider(providerName: 'resend' | 'amazonses'): Promise<TestResult> {
    console.log(`\n🧪 Testing ${providerName.toUpperCase()} provider...`);
    
    const startTime = Date.now();
    
    try {
      // Set the provider in environment
      process.env.EMAIL_PROVIDER = providerName;
      
      // Create new SMTPService instance
      const smtpService = new SMTPService();
      
      // Test email configuration
      const testEmail = process.env.TEST_EMAIL || 'vatsalkhanna5@gmail.com';
      
      console.log(`📧 Sending test email via ${providerName}...`);
      console.log(`   To: ${testEmail}`);
      
      // Send test email
      const result = await smtpService.sendEmail({
        to: testEmail,
        subject: `OpenLearn ${providerName.toUpperCase()} Test - ${new Date().toISOString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">OpenLearn Email Test</h2>
            <p>This is a test email sent via <strong>${providerName.toUpperCase()}</strong> provider.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Provider:</strong> ${providerName}</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Test ID:</strong> ${Math.random().toString(36).substr(2, 9)}</p>
            </div>
            <p>If you received this email, the ${providerName} configuration is working correctly!</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated test from the OpenLearn platform.
            </p>
          </div>
        `,
        text: `OpenLearn Email Test\n\nThis is a test email sent via ${providerName.toUpperCase()} provider.\n\nProvider: ${providerName}\nTimestamp: ${new Date().toISOString()}\n\nIf you received this email, the ${providerName} configuration is working correctly!`
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${providerName.toUpperCase()} test successful!`);
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      console.log(`   Duration: ${duration}ms`);
      
      return {
        provider: providerName,
        success: true,
        message: `Email sent successfully. Message ID: ${result.messageId || 'N/A'}`,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`❌ ${providerName.toUpperCase()} test failed!`);
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Duration: ${duration}ms`);
      
      return {
        provider: providerName,
        success: false,
        message: `Error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Test bulk email sending
   */
  private async testBulkEmail(providerName: 'resend' | 'amazonses'): Promise<TestResult> {
    console.log(`\n📬 Testing bulk email with ${providerName.toUpperCase()}...`);
    
    const startTime = Date.now();
    
    try {
      process.env.EMAIL_PROVIDER = providerName;
      
      const smtpService = new SMTPService();
      
      const testEmail = process.env.TEST_EMAIL || 'vatsalkhanna5@gmail.com';
      
      const bulkEmails = [
        {
          to: testEmail,
          subject: `Bulk Test 1 - ${providerName.toUpperCase()}`,
          html: `<h2>Bulk Email Test 1</h2><p>Testing bulk email functionality with ${providerName}.</p>`,
          text: `Bulk Email Test 1\n\nTesting bulk email functionality with ${providerName}.`
        },
        {
          to: testEmail,
          subject: `Bulk Test 2 - ${providerName.toUpperCase()}`,
          html: `<h2>Bulk Email Test 2</h2><p>Second email in bulk test with ${providerName}.</p>`,
          text: `Bulk Email Test 2\n\nSecond email in bulk test with ${providerName}.`
        }
      ];
      
      const result = await smtpService.sendBulkEmails(bulkEmails);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Bulk email test successful!`);
      console.log(`   Total Sent: ${result.totalSent}`);
      console.log(`   Total Failed: ${result.totalFailed}`);
      
      return {
        provider: `${providerName}-bulk`,
        success: true,
        message: `Bulk emails sent successfully. Sent: ${result.totalSent}, Failed: ${result.totalFailed}`,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`❌ Bulk email test failed!`);
      console.log(`   Error: ${errorMessage}`);
      
      return {
        provider: `${providerName}-bulk`,
        success: false,
        message: `Bulk error: ${errorMessage}`,
        duration
      };
    }
  }

  /**
   * Validate environment configuration for a provider
   */
  private validateProviderConfig(providerName: 'resend' | 'amazonses'): boolean {
    console.log(`\n🔍 Validating ${providerName.toUpperCase()} configuration...`);
    
    if (providerName === 'resend') {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.log(`❌ Missing RESEND_API_KEY`);
        return false;
      }
      if (!apiKey.startsWith('re_')) {
        console.log(`⚠️  RESEND_API_KEY might be invalid (should start with 're_')`);
      }
      console.log(`✅ Resend configuration looks good`);
      return true;
    }
    
    if (providerName === 'amazonses') {
      const accessKey = process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION;
      
      if (!accessKey || !secretKey || !region) {
        console.log(`❌ Missing AWS credentials or region`);
        console.log(`   AWS_ACCESS_KEY_ID: ${accessKey ? '✅' : '❌'}`);
        console.log(`   AWS_SECRET_ACCESS_KEY: ${secretKey ? '✅' : '❌'}`);
        console.log(`   AWS_REGION: ${region ? '✅' : '❌'}`);
        return false;
      }
      console.log(`✅ Amazon SES configuration looks good`);
      return true;
    }
    
    return false;
  }

  /**
   * Run comprehensive email service tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting OpenLearn Email Service Tests\n');
    console.log('=' .repeat(50));
    
    // Check basic configuration
    const testEmail = process.env.TEST_EMAIL;
    const fromEmail = process.env.FROM_EMAIL;
    
    console.log(`📧 Test Configuration:`);
    console.log(`   Test Email: ${testEmail || '❌ Not set (set TEST_EMAIL in .env)'}`);
    console.log(`   From Email: ${fromEmail || '❌ Not set (set FROM_EMAIL in .env)'}`);
    console.log(`   Current Provider: ${process.env.EMAIL_PROVIDER || 'resend (default)'}`);
    
    if (!testEmail) {
      console.log(`\n❌ Please set TEST_EMAIL in your .env file to receive test emails`);
      return;
    }
    
    // Test each provider
    const providersToTest: ('resend' | 'amazonses')[] = ['resend', 'amazonses'];
    
    for (const provider of providersToTest) {
      console.log('\n' + '='.repeat(50));
      
      // Validate configuration first
      if (!this.validateProviderConfig(provider)) {
        this.results.push({
          provider,
          success: false,
          message: 'Configuration validation failed'
        });
        continue;
      }
      
      // Test basic email
      const basicResult = await this.testProvider(provider);
      this.results.push(basicResult);
      
      // Test bulk email (only if basic test passed)
      if (basicResult.success) {
        const bulkResult = await this.testBulkEmail(provider);
        this.results.push(bulkResult);
      }
      
      // Wait a bit between providers to avoid rate limits
      if (provider !== providersToTest[providersToTest.length - 1]) {
        console.log('\n⏱️  Waiting 2 seconds before testing next provider...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Print final results
    this.printResults();
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`\n✅ Successful Tests: ${successful.length}`);
    console.log(`❌ Failed Tests: ${failed.length}`);
    console.log(`📈 Total Tests: ${this.results.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 SUCCESSFUL TESTS:');
      successful.forEach(result => {
        console.log(`   ✅ ${result.provider}: ${result.message} ${result.duration ? `(${result.duration}ms)` : ''}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 FAILED TESTS:');
      failed.forEach(result => {
        console.log(`   ❌ ${result.provider}: ${result.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (failed.length === 0) {
      console.log('🎊 All tests passed! Your email service is working perfectly!');
    } else if (successful.length > 0) {
      console.log('⚠️  Some tests failed, but others passed. Check the configuration for failed providers.');
    } else {
      console.log('🚨 All tests failed. Please check your email service configuration.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Set EMAIL_PROVIDER in .env to your preferred provider (resend|amazonses)');
    console.log('   2. Ensure all required credentials are properly configured');
    console.log('   3. Check spam folders for test emails');
    console.log('   4. Verify domain authentication for production use');
  }
}

/**
 * Quick provider switch function for testing
 */
async function switchAndTestProvider(providerName: 'resend' | 'amazonses'): Promise<void> {
  console.log(`\n🔄 Switching to ${providerName.toUpperCase()} and testing...`);
  
  process.env.EMAIL_PROVIDER = providerName;
  
  try {
    const smtpService = new SMTPService();
    
    const testEmail = process.env.TEST_EMAIL || 'vatsalkhanna5@gmail.com';
    
    const result = await smtpService.sendEmail({
      to: testEmail,
      subject: `Quick ${providerName.toUpperCase()} Test`,
      html: `<h2>Quick test from ${providerName.toUpperCase()}</h2><p>Provider switch successful!</p>`,
      text: `Quick test from ${providerName.toUpperCase()}\nProvider switch successful!`
    });
    
    console.log(`✅ ${providerName.toUpperCase()} test successful! Message ID: ${result.messageId || 'N/A'}`);
    
  } catch (error) {
    console.log(`❌ ${providerName.toUpperCase()} test failed:`, error instanceof Error ? error.message : error);
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    // Check if a specific provider was requested via command line
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      const command = args[0].toLowerCase();
      
      if (command === 'resend' || command === 'amazonses') {
        await switchAndTestProvider(command as 'resend' | 'amazonses');
        return;
      }
      
      if (command === 'help' || command === '--help' || command === '-h') {
        console.log(`
OpenLearn Email Service Tester

Usage:
  npm run test:email              # Run full test suite
  npm run test:email resend       # Test only Resend
  npm run test:email amazonses    # Test only Amazon SES
  npm run test:email help         # Show this help

Environment Variables Required:
  TEST_EMAIL=your.email@example.com
  FROM_EMAIL=noreply@yourdomain.com
  
  For Resend:
    RESEND_API_KEY=re_xxxxxxxxxx
    
  For Amazon SES:
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_REGION=us-east-1
        `);
        return;
      }
      
      console.log(`Unknown command: ${command}`);
      console.log(`Use 'npm run test:email help' for usage information.`);
      return;
    }
    
    // Run full test suite
    const tester = new EmailServiceTester();
    await tester.runTests();
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { EmailServiceTester, switchAndTestProvider };
