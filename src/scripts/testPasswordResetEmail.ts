#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { PasswordResetEmailService } from '../services/email/PasswordResetEmailService';

// Load environment variables
dotenv.config();

/**
 * Test script to send actual password reset emails
 * This tests the email templates and Resend integration
 */

async function testPasswordResetEmail() {
  console.log('🧪 Testing Password Reset Email Integration\n');

  // Test email address (replace with your actual email)
  const testEmail = 'www.rishiahuja@gmail.com';

  try {
    // Test 1: Password Reset Email
    console.log('1. Testing password reset email...');
    const resetResult = await PasswordResetEmailService.sendTestEmail(
      'password-reset',
      testEmail
    );

    if (resetResult.success) {
      console.log('✅ Password reset email sent successfully!');
    } else {
      console.log('❌ Password reset email failed:', resetResult.error);
    }

    // Wait a moment before sending the next email
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Password Reset Success Email
    console.log('\n2. Testing password reset success email...');
    const successResult = await PasswordResetEmailService.sendTestEmail(
      'password-reset-success',
      testEmail
    );

    if (successResult.success) {
      console.log('✅ Password reset success email sent successfully!');
    } else {
      console.log('❌ Password reset success email failed:', successResult.error);
    }

    console.log('\n🎉 Email testing complete!');
    console.log(`📧 Check your inbox at: ${testEmail}`);

  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testPasswordResetEmail().catch(console.error);
}

export { testPasswordResetEmail };
