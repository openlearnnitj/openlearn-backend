#!/usr/bin/env node

// Direct test of Mailtrap provider without HTTP endpoints
// This bypasses any server routing issues

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('🧪 Direct Mailtrap Provider Test');
console.log('=================================');

async function testMailtrapProvider() {
  try {
    console.log('📧 Environment Check:');
    console.log(`EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER}`);
    console.log(`MAILTRAP_API_TOKEN: ${process.env.MAILTRAP_API_TOKEN ? process.env.MAILTRAP_API_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`MAILTRAP_FROM_EMAIL: ${process.env.MAILTRAP_FROM_EMAIL}`);
    console.log('');

    // Import the factory
    const { EmailProviderFactory } = require('../../dist/services/email/EmailProviderFactory');
    
    console.log('🔧 Testing Email Provider Factory...');
    const emailProvider = EmailProviderFactory.createFromEnvironment();
    const config = emailProvider.getConfig();
    
    console.log('✅ Provider created successfully:');
    console.log(`   Provider: ${config.provider}`);
    console.log(`   From: ${config.fromName} <${config.fromEmail}>`);
    console.log('');

    console.log('🔌 Testing Connection...');
    const connectionTest = await emailProvider.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connection test successful!');
    } else {
      console.log('❌ Connection test failed:');
      console.log(`   Error: ${connectionTest.error}`);
      return;
    }
    console.log('');

    console.log('📨 Testing Email Send...');
    const emailResult = await emailProvider.sendEmail({
      to: 'www.rishiahuja@gmail.com',
      subject: 'Direct Mailtrap Test',
      html: '<h1>Direct Test</h1><p>This email was sent directly via the Mailtrap provider class.</p>',
      text: 'Direct Test\n\nThis email was sent directly via the Mailtrap provider class.'
    });

    if (emailResult.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${emailResult.messageId}`);
      console.log('');
      console.log('🎉 Mailtrap integration is working correctly!');
      console.log('📬 Check your Mailtrap inbox for the test email.');
    } else {
      console.log('❌ Email send failed:');
      console.log(`   Error: ${emailResult.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('1. Make sure the server has been built: npm run build');
    console.error('2. Check that MAILTRAP_API_TOKEN is set correctly');
    console.error('3. Verify Mailtrap account and token are valid');
  }
}

testMailtrapProvider();
