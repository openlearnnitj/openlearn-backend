import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseEmailRestriction(): Promise<void> {
  console.log('🚨 OpenLearn Email Account Restriction Diagnostic');
  console.log('═'.repeat(60));
  
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'info@openlearn.org.in',
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
    }
  };

  console.log('\n📧 Account Information:');
  console.log(`Email: ${emailConfig.auth.user}`);
  console.log(`SMTP Host: ${emailConfig.host}`);
  console.log(`Port: ${emailConfig.port}`);
  console.log(`Password Length: ${emailConfig.auth.pass.length} characters`);
  
  console.log('\n🔍 Testing Authentication...');
  
  try {
    const transporter = nodemailer.createTransport(emailConfig);
    await transporter.verify();
    
    console.log('✅ SUCCESS! Account is no longer restricted!');
    console.log('🎉 You can now use the email service.');
    
  } catch (error: any) {
    console.log('❌ FAILED: Account is still restricted.');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('535') && error.message.includes('restricted')) {
      console.log('\n🔒 ACCOUNT RESTRICTION CONFIRMED');
      console.log('');
      console.log('📋 This error means:');
      console.log('   • Your GoDaddy email account has been temporarily locked');
      console.log('   • This is a security measure after failed login attempts');
      console.log('   • The account needs to be unlocked by GoDaddy');
      console.log('');
      console.log('🔧 IMMEDIATE ACTION REQUIRED:');
      console.log('');
      console.log('1. 🌐 Login to GoDaddy Webmail:');
      console.log('   → Go to: https://email.godaddy.com');
      console.log(`   → Email: ${emailConfig.auth.user}`);
      console.log('   → Try logging in with your password');
      console.log('   → Check for any security notifications');
      console.log('');
      console.log('2. 📞 Contact GoDaddy Support:');
      console.log('   → Login to your GoDaddy account');
      console.log('   → Go to Help Center');
      console.log('   → Request email account unlock');
      console.log('   → Mention error: "535 User has been restricted"');
      console.log('');
      console.log('3. ⏰ Wait and Retry:');
      console.log('   → Sometimes restriction lifts automatically');
      console.log('   → Wait 30-60 minutes');
      console.log('   → Try again later');
      console.log('');
      console.log('4. 🔄 Alternative Solutions:');
      console.log('   → Reset your email password');
      console.log('   → Enable/disable 2FA if applicable');
      console.log('   → Check for account verification requirements');
      
    } else {
      console.log('\n❓ Different error detected:');
      console.log(`   ${error.message}`);
    }
  }
  
  console.log('\n📋 Next Steps After Account Unlock:');
  console.log('1. Run this diagnostic again to confirm');
  console.log('2. Update production environment');
  console.log('3. Test email service in production');
  console.log('4. Monitor for any further restrictions');
  
  console.log('\n🔧 Commands to run after unlock:');
  console.log('   npx ts-node src/scripts/emailDiagnostic.ts');
  console.log('   curl -X POST https://api.openlearn.org.in/api/debug/email-debug');
}

async function waitAndRetry(): Promise<void> {
  console.log('\n⏰ Waiting 30 seconds before retry...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log('🔄 Retrying authentication...');
  await diagnoseEmailRestriction();
}

async function testAlternativeConfiguration(): Promise<void> {
  console.log('\n🔧 Testing Alternative SMTP Configuration...');
  
  // Try with different settings
  const alternativeConfigs = [
    {
      name: 'Port 587 with STARTTLS',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'info@openlearn.org.in',
          pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
        }
      }
    },
    {
      name: 'Port 25 (Plain)',
      config: {
        host: 'smtpout.secureserver.net',
        port: 25,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'info@openlearn.org.in',
          pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
        }
      }
    }
  ];
  
  for (const { name, config } of alternativeConfigs) {
    console.log(`\nTesting: ${name}`);
    try {
      const transporter = nodemailer.createTransport(config);
      await transporter.verify();
      console.log(`✅ ${name}: SUCCESS! This configuration works.`);
      return;
    } catch (error: any) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  console.log('\n❌ All alternative configurations failed.');
  console.log('The issue is definitely account restriction, not configuration.');
}

// Main execution
async function main(): Promise<void> {
  try {
    await diagnoseEmailRestriction();
    
    // If still failing, try alternatives
    console.log('\n🔧 Trying alternative configurations...');
    await testAlternativeConfiguration();
    
  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
if (require.main === module) {
  main().catch(console.error);
}

export { diagnoseEmailRestriction, waitAndRetry };
