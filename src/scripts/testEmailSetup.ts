#!/usr/bin/env ts-node

/**
 * Simple Email Provider Test
 * Tests the current email setup with Resend
 */

import dotenv from 'dotenv';
dotenv.config();

async function testCurrentEmailSetup() {
  console.log('🔍 Testing Current Email Setup');
  console.log('==============================\n');

  console.log('Environment Variables:');
  console.log(`EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}`);
  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`SES_ACCESS_KEY_ID: ${process.env.SES_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Test with EMAIL_PROVIDER=resend
  process.env.EMAIL_PROVIDER = 'resend';
  console.log('✅ Set EMAIL_PROVIDER=resend');
  console.log('To use Resend, make sure you have:');
  console.log('- RESEND_API_KEY configured');
  console.log('- RESEND_FROM_EMAIL configured');
  console.log('');

  // Test with EMAIL_PROVIDER=amazon_ses  
  console.log('To switch to Amazon SES later:');
  console.log('1. Set EMAIL_PROVIDER=amazon_ses in .env');
  console.log('2. Ensure SES credentials are configured');
  console.log('3. Restart the application');
  console.log('');

  console.log('🎯 Next Steps:');
  console.log('1. Configure your Resend API key');
  console.log('2. Test email sending with Resend');
  console.log('3. When ready, switch to Amazon SES by changing EMAIL_PROVIDER');
}

testCurrentEmailSetup().catch(console.error);
