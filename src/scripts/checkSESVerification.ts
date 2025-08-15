#!/usr/bin/env ts-node

/**
 * SES Email Verification Checker
 * 
 * This script checks which email addresses are verified in Amazon SES
 * and provides instructions for verifying unverified addresses.
 * 
 * Usage:
 *   ts-node src/scripts/checkSESVerification.ts
 */

import dotenv from 'dotenv';
import { SESClient, ListVerifiedEmailAddressesCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';

// Load environment variables
dotenv.config();

/**
 * List of email addresses that need to be verified for testing
 */
const requiredEmails = [
  'info@openlearn.org.in',       // Verified sender
  'www.rishiahuja@gmail.com',    // Test recipient 1
  'vatsalkhanna5@gmail.com',     // Test recipient 2
  'rishia2220@gmail.com',        // Test recipient 3
  'chahat.try@gmail.com',        // Test recipient 4
  'chahat.create@gmail.com',     // Test recipient 5
  'chahat.album@gmail.com',      // Test recipient 6
];

async function checkSESVerification(): Promise<void> {
  console.log('🔍 Checking Amazon SES Email Verification Status');
  console.log('================================================\n');

  // Validate environment variables
  const requiredEnvVars = ['SES_REGION', 'SES_ACCESS_KEY_ID', 'SES_SECRET_ACCESS_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    process.exit(1);
  }

  try {
    // Initialize SES client
    const sesClient = new SESClient({
      region: process.env.SES_REGION!,
      credentials: {
        accessKeyId: process.env.SES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
      },
    });

    console.log(`📧 Region: ${process.env.SES_REGION}`);
    console.log(`📧 From Email: ${process.env.SES_FROM_EMAIL}\n`);

    // Check SES quota first
    console.log('📊 Checking SES Account Status...');
    try {
      const quotaCommand = new GetSendQuotaCommand({});
      const quotaResult = await sesClient.send(quotaCommand);
      
      console.log(`✅ Send Quota: ${quotaResult.Max24HourSend || 'N/A'} emails per 24 hours`);
      console.log(`📈 Sent in last 24h: ${quotaResult.SentLast24Hours || 0}`);
      console.log(`⚡ Send Rate: ${quotaResult.MaxSendRate || 'N/A'} emails per second`);
      
      // Check if in sandbox mode
      const isInSandbox = (quotaResult.Max24HourSend || 0) <= 200;
      if (isInSandbox) {
        console.log('⚠️  Account is in SANDBOX mode - only verified emails can receive messages');
      } else {
        console.log('✅ Account has PRODUCTION access - can send to any email');
      }
      console.log('');
    } catch (error) {
      console.log('❌ Could not retrieve SES quota information');
      console.log('');
    }

    // Get list of verified email addresses
    console.log('🔍 Checking verified email addresses...');
    const listCommand = new ListVerifiedEmailAddressesCommand({});
    const result = await sesClient.send(listCommand);
    
    const verifiedEmails = result.VerifiedEmailAddresses || [];
    
    console.log(`\n📋 Verified Email Addresses (${verifiedEmails.length}):`);
    if (verifiedEmails.length === 0) {
      console.log('   ❌ No email addresses are verified');
    } else {
      verifiedEmails.forEach(email => {
        console.log(`   ✅ ${email}`);
      });
    }

    console.log(`\n🎯 Required Email Addresses for Testing (${requiredEmails.length}):`);
    
    const verificationStatus = requiredEmails.map(email => {
      const isVerified = verifiedEmails.includes(email);
      return { email, isVerified };
    });

    verificationStatus.forEach(({ email, isVerified }) => {
      const status = isVerified ? '✅' : '❌';
      console.log(`   ${status} ${email}`);
    });

    // Summary
    const verifiedCount = verificationStatus.filter(s => s.isVerified).length;
    const unverifiedCount = requiredEmails.length - verifiedCount;

    console.log(`\n📊 Verification Summary:`);
    console.log(`   ✅ Verified: ${verifiedCount}/${requiredEmails.length}`);
    console.log(`   ❌ Unverified: ${unverifiedCount}/${requiredEmails.length}`);

    if (unverifiedCount > 0) {
      console.log(`\n🚧 Next Steps:`);
      console.log(`   1. Log into AWS SES Console: https://console.aws.amazon.com/ses/`);
      console.log(`   2. Go to "Verified identities" section`);
      console.log(`   3. Click "Create identity" and add these unverified emails:`);
      
      verificationStatus
        .filter(s => !s.isVerified)
        .forEach(({ email }) => {
          console.log(`      - ${email}`);
        });
      
      console.log(`   4. Check email inboxes and click verification links`);
      console.log(`   5. Run this script again to verify all emails are confirmed`);
      console.log(`   6. Then run: npm run test:ses`);
      
      console.log(`\n⚠️  Important Notes:`);
      console.log(`   - In SES sandbox mode, you can only send TO verified email addresses`);
      console.log(`   - The FROM email (${process.env.SES_FROM_EMAIL}) must also be verified`);
      console.log(`   - To send to any email address, request production access in SES console`);
      
    } else {
      console.log(`\n🎉 All required emails are verified!`);
      console.log(`   You can now run: npm run test:ses`);
    }

  } catch (error: any) {
    console.error('💥 Error checking SES verification:', error);
    
    if (error.name === 'CredentialsProviderError') {
      console.error('\n🔑 AWS Credentials Issue:');
      console.error('   - Check that SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are correct');
      console.error('   - Verify that the IAM user has SES permissions');
    } else if (error.name === 'UnauthorizedOperation') {
      console.error('\n🚫 Permission Issue:');
      console.error('   - The IAM user may not have permission to list verified emails');
      console.error('   - Add "ses:ListVerifiedEmailAddresses" permission to the IAM user');
    }
    
    process.exit(1);
  }
}

// Run the verification check
if (require.main === module) {
  checkSESVerification().catch(console.error);
}

export { checkSESVerification };
