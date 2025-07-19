import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EmailDiagnosticResult {
  success: boolean;
  error?: string;
  details?: any;
  suggestions?: string[];
}

async function comprehensiveEmailDiagnostic(): Promise<void> {
  console.log('🔍 OpenLearn Email Service - Comprehensive Diagnostic');
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

  console.log('\n📧 Current Configuration:');
  console.log(`Host: ${emailConfig.host}`);
  console.log(`Port: ${emailConfig.port}`);
  console.log(`Secure: ${emailConfig.secure}`);
  console.log(`User: ${emailConfig.auth.user}`);
  console.log(`Pass: ${'*'.repeat(emailConfig.auth.pass.length)} (${emailConfig.auth.pass.length} chars)`);
  
  // Step 1: Test basic SMTP connection
  console.log('\n🔌 Step 1: Testing SMTP Connection');
  console.log('─'.repeat(40));
  const connectionResult = await testSMTPConnection(emailConfig);
  displayResult('SMTP Connection', connectionResult);
  
  if (!connectionResult.success) {
    await analyzeConnectionError(connectionResult.error || '');
    return;
  }

  // Step 2: Test authentication
  console.log('\n🔑 Step 2: Testing Authentication');
  console.log('─'.repeat(40));
  const authResult = await testAuthentication(emailConfig);
  displayResult('Authentication', authResult);
  
  if (!authResult.success) {
    await analyzeAuthError(authResult.error || '', emailConfig.auth.user);
    return;
  }

  // Step 3: Test email sending
  console.log('\n📧 Step 3: Testing Email Sending');
  console.log('─'.repeat(40));
  const sendResult = await testEmailSending(emailConfig);
  displayResult('Email Sending', sendResult);
  
  if (sendResult.success) {
    console.log('\n🎉 SUCCESS! Email service is fully operational!');
    await suggestNextSteps();
  }
}

async function testSMTPConnection(config: any): Promise<EmailDiagnosticResult> {
  try {
    const transporter = nodemailer.createTransport(config);
    
    // Test connection without authentication
    const info = await new Promise((resolve, reject) => {
      const connection = transporter.createConnection();
      connection.connect(() => {
        connection.quit();
        resolve({ success: true });
      });
      connection.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    return { success: true, details: info };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      details: error
    };
  }
}

async function testAuthentication(config: any): Promise<EmailDiagnosticResult> {
  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.verify();
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      details: {
        code: error.code,
        response: error.response,
        command: error.command
      }
    };
  }
}

async function testEmailSending(config: any): Promise<EmailDiagnosticResult> {
  try {
    const transporter = nodemailer.createTransport(config);
    
    const result = await transporter.sendMail({
      from: `"OpenLearn Platform" <${config.auth.user}>`,
      to: 'www.rishiahuja@gmail.com',
      subject: `Email Service Test - ${new Date().toISOString()}`,
      html: `
        <h2>✅ Email Service Test Successful!</h2>
        <p>This email confirms that the OpenLearn email service is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Configuration:</strong> ${config.host}:${config.port}</p>
        <hr>
        <p>The email service diagnostic completed successfully!</p>
      `,
      text: `Email Service Test Successful!\n\nTimestamp: ${new Date().toLocaleString()}\nConfiguration: ${config.host}:${config.port}\n\nThe email service diagnostic completed successfully!`
    });
    
    return { 
      success: true, 
      details: {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      }
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message,
      details: error
    };
  }
}

async function analyzeConnectionError(error: string): Promise<void> {
  console.log('\n🚨 Connection Error Analysis:');
  console.log('─'.repeat(40));
  
  if (error.includes('ECONNREFUSED')) {
    console.log('❌ Connection refused - SMTP server is unreachable');
    console.log('💡 Possible solutions:');
    console.log('   • Check if host and port are correct');
    console.log('   • Verify firewall settings');
    console.log('   • Check if server IP is blocked');
  } else if (error.includes('ETIMEDOUT')) {
    console.log('❌ Connection timeout - Network or firewall issue');
    console.log('💡 Possible solutions:');
    console.log('   • Check network connectivity');
    console.log('   • Verify firewall allows outbound SMTP');
    console.log('   • Try different port (25, 465, 587)');
  } else if (error.includes('ENOTFOUND')) {
    console.log('❌ Host not found - DNS resolution issue');
    console.log('💡 Possible solutions:');
    console.log('   • Check SMTP host spelling');
    console.log('   • Verify DNS settings');
    console.log('   • Try using IP address instead');
  } else {
    console.log(`❌ Unknown connection error: ${error}`);
  }
}

async function analyzeAuthError(error: string, username: string): Promise<void> {
  console.log('\n🚨 Authentication Error Analysis:');
  console.log('─'.repeat(40));
  
  if (error.includes('535') && error.includes('restricted')) {
    console.log('🔒 ACCOUNT RESTRICTED - This is the main issue!');
    console.log('');
    console.log('📋 What this means:');
    console.log('   • Your email account has been temporarily locked by GoDaddy');
    console.log('   • This usually happens after multiple failed login attempts');
    console.log('   • It\'s a security measure to prevent unauthorized access');
    console.log('');
    console.log('🔧 Immediate solutions:');
    console.log('   1. Wait 15-30 minutes for automatic unlock');
    console.log('   2. Login to GoDaddy webmail to verify account status');
    console.log('   3. Contact GoDaddy support to unlock the account');
    console.log('   4. Reset password if requested');
    console.log('');
    console.log('🌐 GoDaddy Webmail: https://email.godaddy.com');
    console.log(`📧 Account: ${username}`);
    console.log('📞 GoDaddy Support: Contact via your GoDaddy account');
    
  } else if (error.includes('535') && error.includes('Authentication failed')) {
    console.log('❌ Authentication failed - Wrong credentials');
    console.log('💡 Possible solutions:');
    console.log('   • Verify username and password');
    console.log('   • Check if 2FA requires app password');
    console.log('   • Try logging into webmail first');
    
  } else if (error.includes('534')) {
    console.log('❌ Authentication mechanism not supported');
    console.log('💡 Possible solutions:');
    console.log('   • Try different authentication method');
    console.log('   • Check SMTP server settings');
    
  } else {
    console.log(`❌ Unknown authentication error: ${error}`);
  }
  
  console.log('\n🔍 Next steps:');
  console.log('1. Check account status at GoDaddy webmail');
  console.log('2. Wait 30 minutes and try again');
  console.log('3. Contact GoDaddy support if issue persists');
  console.log('4. Consider using a different email service temporarily');
}

function displayResult(testName: string, result: EmailDiagnosticResult): void {
  if (result.success) {
    console.log(`✅ ${testName}: SUCCESS`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  } else {
    console.log(`❌ ${testName}: FAILED`);
    console.log(`   Error: ${result.error}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }
}

async function suggestNextSteps(): Promise<void> {
  console.log('\n📋 Next Steps:');
  console.log('1. Update production environment with working configuration');
  console.log('2. Test email endpoints in production');
  console.log('3. Update documentation with correct settings');
  console.log('4. Monitor email service health');
  console.log('');
  console.log('🔧 Production update commands:');
  console.log('   docker compose restart email-worker');
  console.log('   curl -X POST https://api.openlearn.org.in/api/debug/email-debug');
}

async function checkAccountStatus(): Promise<void> {
  console.log('\n🔍 Account Status Check Instructions:');
  console.log('═'.repeat(50));
  console.log('');
  console.log('1. 🌐 Go to GoDaddy Webmail:');
  console.log('   https://email.godaddy.com');
  console.log('');
  console.log('2. 📧 Login with your credentials:');
  console.log(`   Email: ${process.env.SMTP_USER}`);
  console.log(`   Password: [Your password]`);
  console.log('');
  console.log('3. 🔍 Check for any notifications about:');
  console.log('   • Account lockout/restriction');
  console.log('   • Security alerts');
  console.log('   • Required verification');
  console.log('');
  console.log('4. 📞 If account is locked:');
  console.log('   • Contact GoDaddy support');
  console.log('   • Request account unlock');
  console.log('   • Verify your identity');
  console.log('');
  console.log('5. ⏰ If no immediate solution:');
  console.log('   • Wait 30-60 minutes');
  console.log('   • Try again later');
  console.log('   • Consider temporary email service');
}

// Main execution
async function main(): Promise<void> {
  try {
    await comprehensiveEmailDiagnostic();
    await checkAccountStatus();
  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
if (require.main === module) {
  main().catch(console.error);
}

export { comprehensiveEmailDiagnostic, checkAccountStatus };
