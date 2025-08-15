#!/usr/bin/env ts-node

/**
 * Modular Email Service Test Script
 * 
 * This script tests the modular email service with both Resend and Amazon SES providers.
 * It demonstrates how to switch between providers and validates that both work correctly.
 * 
 * Usage:
 *   npm run test:email-providers
 *   OR
 *   ts-node src/scripts/testModularEmailService.ts
 */

import dotenv from 'dotenv';
import SMTPService from '../services/email/SMTPService';
import { EmailProviderFactory } from '../services/email/EmailProviderFactory';
import { EmailProvider } from '../services/email/interfaces/EmailProviderInterface';

// Load environment variables
dotenv.config();

interface TestEmail {
  name: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const testEmails: TestEmail[] = [
  {
    name: 'Provider Test Email',
    to: 'www.rishiahuja@gmail.com',
    subject: 'OpenLearn Modular Email Service Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">OpenLearn Modular Email Service</h1>
        <p>This email was sent using the modular email service.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Test Details:</h3>
          <ul>
            <li><strong>Test Type:</strong> Provider Switch Test</li>
            <li><strong>Date:</strong> ${new Date().toISOString()}</li>
            <li><strong>Provider:</strong> Will be dynamically set</li>
          </ul>
        </div>
        <p>If you receive this email, the modular email service is working correctly!</p>
      </div>
    `,
    text: `
OpenLearn Modular Email Service Test

This email was sent using the modular email service.

Test Details:
- Test Type: Provider Switch Test
- Date: ${new Date().toISOString()}
- Provider: Will be dynamically set

If you receive this email, the modular email service is working correctly!
    `,
  },
];

async function testEmailProvider(providerName: string): Promise<{ success: boolean; error?: string }> {
  console.log(`\n🧪 Testing ${providerName.toUpperCase()} Provider`);
  console.log('='.repeat(40));

  try {
    // Validate provider configuration
    const provider = providerName === 'resend' ? EmailProvider.RESEND : EmailProvider.AMAZON_SES;
    const validation = EmailProviderFactory.validateProviderConfig(provider);
    
    if (!validation.valid) {
      console.log(`❌ Missing configuration for ${providerName}:`);
      validation.missing.forEach(missing => {
        console.log(`   - ${missing}`);
      });
      return { success: false, error: `Missing configuration: ${validation.missing.join(', ')}` };
    }

    console.log(`✅ Configuration validated for ${providerName}`);

    // Set environment variable to use this provider
    process.env.EMAIL_PROVIDER = providerName;

    // Create SMTP service (it will use the provider from env)
    const smtpService = new SMTPService();
    const config = smtpService.getConfig();
    
    console.log(`📧 Provider: ${config.provider}`);
    console.log(`📧 From Email: ${config.fromEmail}`);

    // Test connection
    console.log(`🔍 Testing connection...`);
    const connectionTest = await smtpService.testConnection();
    
    if (!connectionTest.success) {
      console.log(`❌ Connection test failed: ${connectionTest.error}`);
      return { success: false, error: connectionTest.error };
    }
    
    console.log(`✅ Connection test successful`);

    // Send test email
    console.log(`📤 Sending test email...`);
    const emailResult = await smtpService.sendEmail({
      ...testEmails[0],
      subject: `${testEmails[0].subject} - ${config.provider}`,
      html: testEmails[0].html?.replace('Will be dynamically set', config.provider),
      text: testEmails[0].text?.replace('Will be dynamically set', config.provider),
    });

    if (!emailResult.success) {
      console.log(`❌ Email sending failed: ${emailResult.error}`);
      return { success: false, error: emailResult.error };
    }

    console.log(`✅ Email sent successfully - Message ID: ${emailResult.messageId}`);
    
    // Close service
    await smtpService.close();

    return { success: true };

  } catch (error: any) {
    console.log(`💥 Provider test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runModularEmailTests(): Promise<void> {
  console.log('🚀 Starting Modular Email Service Tests');
  console.log('=======================================\n');

  const results: { [key: string]: { success: boolean; error?: string } } = {};

  // Test Resend Provider
  if (process.env.RESEND_API_KEY) {
    results.resend = await testEmailProvider('resend');
  } else {
    console.log('\n⚠️  Skipping Resend test - RESEND_API_KEY not configured');
    results.resend = { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Small delay between provider tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test Amazon SES Provider
  if (process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY) {
    results.amazon_ses = await testEmailProvider('amazon_ses');
  } else {
    console.log('\n⚠️  Skipping Amazon SES test - SES credentials not configured');
    results.amazon_ses = { success: false, error: 'SES credentials not configured' };
  }

  // Display Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');

  const providers = Object.keys(results);
  const successful = providers.filter(p => results[p].success).length;
  const failed = providers.filter(p => !results[p].success).length;

  console.log(`✅ Successful: ${successful}/${providers.length}`);
  console.log(`❌ Failed: ${failed}/${providers.length}`);
  console.log('');

  // Detailed results
  providers.forEach(provider => {
    const result = results[provider];
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${provider.toUpperCase()}: ${result.success ? 'SUCCESS' : result.error}`);
  });

  console.log('\n⚙️  Available Providers');
  console.log('=======================');
  const availableProviders = EmailProviderFactory.getAvailableProviders();
  availableProviders.forEach(provider => {
    console.log(`- ${provider}`);
  });

  console.log('\n🔄 Provider Switching Guide');
  console.log('============================');
  console.log('To switch email providers, update the EMAIL_PROVIDER environment variable:');
  console.log('');
  console.log('For Resend:');
  console.log('  EMAIL_PROVIDER=resend');
  console.log('');
  console.log('For Amazon SES:');
  console.log('  EMAIL_PROVIDER=amazon_ses');
  console.log('');
  console.log('Then restart your application for the changes to take effect.');

  if (successful > 0) {
    console.log('\n🎉 Modular email service is working correctly!');
    console.log('You can now switch between providers by changing the EMAIL_PROVIDER environment variable.');
  } else {
    console.log('\n⚠️  No providers are currently working. Please check your configuration.');
  }
}

// Run the tests
if (require.main === module) {
  runModularEmailTests().catch(console.error);
}

export { runModularEmailTests };
