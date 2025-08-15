#!/usr/bin/env ts-node

/**
 * Test Script for Amazon SES Email Service
 * 
 * This script tests the SES email service by sending 6 different types of emails
 * to verify that the migration from Resend to Amazon SES is working correctly.
 * 
 * Usage:
 *   npm run test:ses
 *   OR
 *   ts-node src/scripts/testSESEmails.ts
 * 
 * Environment Variables Required:
 *   - SES_REGION
 *   - SES_ACCESS_KEY_ID  
 *   - SES_SECRET_ACCESS_KEY
 *   - SES_FROM_EMAIL
 */

import dotenv from 'dotenv';
import { SMTPService } from '../services/email/SMTPService';

// Load environment variables
dotenv.config();

interface TestEmail {
  name: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Test email configurations
 * 
 * NOTE: These are the actual recipient emails for testing the SES integration.
 * In SES sandbox mode, all recipient emails must be verified in the AWS SES console.
 */
const testEmails: TestEmail[] = [
  {
    name: 'Welcome Email (HTML)',
    to: 'www.rishiahuja@gmail.com',
    subject: 'Welcome to OpenLearn Platform - Test Email 1',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to OpenLearn!</h1>
        <p>This is a test HTML email to verify Amazon SES integration.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Test Details:</h3>
          <ul>
            <li><strong>Test Type:</strong> HTML Email</li>
            <li><strong>Service:</strong> Amazon SES</li>
            <li><strong>Date:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
        <p>If you receive this email, the SES integration is working correctly!</p>
        <hr>
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated test email from OpenLearn Platform.
        </p>
      </div>
    `,
  },
  {
    name: 'Account Verification (Text + HTML)',
    to: 'vatsalkhanna5@gmail.com',
    subject: 'Account Verification Required - Test Email 2',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Verification Required</h2>
        <p>Please verify your account by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Account
          </a>
        </div>
        <p><strong>Test Email:</strong> HTML + Text content</p>
      </div>
    `,
    text: `
Account Verification Required

Please verify your account by visiting: https://openlearn.org.in/verify

This is a test email with both HTML and text content.

Test Type: HTML + Text Email
Service: Amazon SES
Date: ${new Date().toISOString()}

This is an automated test email from OpenLearn Platform.
    `,
  },
  {
    name: 'Plain Text Email',
    to: 'rishia2220@gmail.com',
    subject: 'Plain Text Notification - Test Email 3',
    text: `
Hello from OpenLearn Platform!

This is a plain text email to test the Amazon SES integration.

Test Details:
- Test Type: Plain Text Email
- Service: Amazon SES
- Date: ${new Date().toISOString()}

Features tested:
✓ Plain text content
✓ No HTML formatting
✓ Simple text structure

If you receive this email, the SES text-only email functionality is working correctly!

---
This is an automated test email from OpenLearn Platform.
    `,
  },
  {
    name: 'Course Enrollment (with CC)',
    to: 'chahat.try@gmail.com',
    cc: ['www.rishiahuja@gmail.com'], // CC to the main test email
    subject: 'Course Enrollment Confirmation - Test Email 4',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Course Enrollment Confirmed</h2>
        <p>Congratulations! You have been successfully enrolled in:</p>
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0; color: #059669;">Advanced TypeScript Development</h3>
          <p style="margin: 5px 0; color: #047857;">Start Date: January 15, 2024</p>
          <p style="margin: 5px 0; color: #047857;">Duration: 8 weeks</p>
        </div>
        <p><strong>Test Features:</strong></p>
        <ul>
          <li>HTML content with styling</li>
          <li>CC recipient (admin notification)</li>
          <li>Course-related template</li>
        </ul>
      </div>
    `,
  },
  {
    name: 'System Alert (with BCC)',
    to: 'chahat.create@gmail.com',
    bcc: ['vatsalkhanna5@gmail.com'], // BCC to another test email
    subject: 'System Alert: Migration Test - Test Email 5',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ System Alert</h2>
          <p>This is a test system alert to verify BCC functionality.</p>
          <div style="background-color: #fff; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h4 style="margin: 0 0 10px 0;">Alert Details:</h4>
            <ul style="margin: 0;">
              <li><strong>Type:</strong> Migration Test</li>
              <li><strong>Priority:</strong> Low</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              <li><strong>Service:</strong> Amazon SES</li>
            </ul>
          </div>
          <p><strong>Test Features:</strong> BCC recipient (monitoring team)</p>
        </div>
      </div>
    `,
  },
  {
    name: 'Password Reset (Complete Test)',
    to: 'chahat.album@gmail.com',
    subject: 'Password Reset Request - Test Email 6',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Password Reset Request</h2>
        <p>A password reset has been requested for your OpenLearn account.</p>
        <div style="background-color: #faf5ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Security Information:</strong></p>
          <ul>
            <li>Request Time: ${new Date().toISOString()}</li>
            <li>IP Address: 192.168.1.100 (test)</li>
            <li>User Agent: Test Browser</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this password reset, please ignore this email.
          This link will expire in 24 hours.
        </p>
        <p><strong>Final Test:</strong> Complete SES functionality verification</p>
      </div>
    `,
    text: `
Password Reset Request

A password reset has been requested for your OpenLearn account.

Security Information:
- Request Time: ${new Date().toISOString()}
- IP Address: 192.168.1.100 (test)
- User Agent: Test Browser

To reset your password, visit: https://openlearn.org.in/reset-password

If you didn't request this password reset, please ignore this email.
This link will expire in 24 hours.

Final Test: Complete SES functionality verification

---
This is an automated test email from OpenLearn Platform.
    `,
  },
];

/**
 * Send test emails and display results
 */
async function runSESEmailTests(): Promise<void> {
  console.log('🚀 Starting Amazon SES Email Tests');
  console.log('=====================================\n');

  // Validate environment variables
  const requiredEnvVars = [
    'SES_REGION',
    'SES_ACCESS_KEY_ID',
    'SES_SECRET_ACCESS_KEY',
    'SES_FROM_EMAIL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease update your .env file with the required SES configuration.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
  console.log(`📧 From Email: ${process.env.SES_FROM_EMAIL}`);
  console.log(`🌍 Region: ${process.env.SES_REGION}`);
  console.log('');

  try {
    // Initialize SES service
    const smtpService = new SMTPService();
    
    // Test connection first
    console.log('🔍 Testing SES connection...');
    const connectionTest = await smtpService.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ SES connection test failed:', connectionTest.error);
      console.error('\nPlease verify your AWS credentials and SES configuration.');
      process.exit(1);
    }
    
    console.log('✅ SES connection test successful\n');

    // Send test emails
    const results: Array<{
      name: string;
      success: boolean;
      messageId?: string;
      error?: string;
      duration: number;
    }> = [];

    for (const [index, email] of testEmails.entries()) {
      const startTime = Date.now();
      
      console.log(`📤 Sending Test ${index + 1}/6: ${email.name}`);
      console.log(`   To: ${email.to}`);
      if (email.cc) console.log(`   CC: ${email.cc.join(', ')}`);
      if (email.bcc) console.log(`   BCC: ${email.bcc.join(', ')}`);
      
      const result = await smtpService.sendEmail(email);
      const duration = Date.now() - startTime;
      
      results.push({
        name: email.name,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        duration,
      });

      if (result.success) {
        console.log(`   ✅ Success - Message ID: ${result.messageId} (${duration}ms)`);
      } else {
        console.log(`   ❌ Failed - Error: ${result.error} (${duration}ms)`);
      }
      
      console.log('');

      // Add delay between emails to respect rate limits
      if (index < testEmails.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next email...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Display summary
    console.log('📊 Test Results Summary');
    console.log('========================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    console.log(`✅ Successful: ${successful}/${testEmails.length}`);
    console.log(`❌ Failed: ${failed}/${testEmails.length}`);
    console.log(`⏱️  Average Duration: ${Math.round(avgDuration)}ms`);
    console.log('');

    // Display detailed results
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} Test ${index + 1}: ${result.name}`);
      if (result.success) {
        console.log(`    Message ID: ${result.messageId}`);
      } else {
        console.log(`    Error: ${result.error}`);
      }
      console.log(`    Duration: ${result.duration}ms`);
      console.log('');
    });

    // Display service configuration
    const config = smtpService.getConfig();
    console.log('⚙️  Service Configuration');
    console.log('==========================');
    console.log(`Provider: ${config.provider}`);
    console.log(`Region: ${config.region}`);
    console.log(`From Email: ${config.fromEmail}`);
    console.log(`From Name: ${config.fromName}`);
    console.log('');

    if (successful === testEmails.length) {
      console.log('🎉 All tests passed! Amazon SES integration is working correctly.');
      console.log('');
      console.log('Next Steps:');
      console.log('- Update your production environment variables');
      console.log('- Verify sender domain in SES console');
      console.log('- Move out of SES sandbox mode for production');
      console.log('- Update frontend integration documentation');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above and verify:');
      console.log('- AWS credentials are correct');
      console.log('- Recipient emails are verified in SES (sandbox mode)');
      console.log('- SES service is available in your region');
      console.log('- From email is verified in SES');
    }

  } catch (error: any) {
    console.error('💥 Fatal error during testing:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runSESEmailTests().catch(console.error);
}

export { runSESEmailTests };
