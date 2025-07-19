import dotenv from 'dotenv';
import SMTPService from '../services/email/SMTPService';

// Load environment variables
dotenv.config();

async function testResendIntegration(): Promise<void> {
  console.log('🚀 Testing Resend Email Integration');
  console.log('═'.repeat(50));
  
  try {
    // Check if API key is available
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    console.log('\n📧 Configuration:');
    console.log(`API Key: ${apiKey ? '✅ Set (' + apiKey.substring(0, 10) + '...)' : '❌ Missing'}`);
    console.log(`From Email: ${fromEmail || '❌ Missing'}`);
    
    if (!apiKey) {
      console.log('\n❌ RESEND_API_KEY is not set in environment variables');
      return;
    }

    // Initialize the service
    console.log('\n🔧 Initializing Resend service...');
    const emailService = new SMTPService();
    
    // Test connection
    console.log('\n🔗 Testing Resend API connection...');
    const connectionResult = await emailService.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ Resend API connection successful!');
    } else {
      console.log(`❌ Connection failed: ${connectionResult.error}`);
      return;
    }

    // Test sending email
    console.log('\n📧 Sending test email...');
    const testEmails = [
      'www.rishiahuja@gmail.com',
      'rishia2220@gmail.com',
      'chahat.create@gmail.com'
    ];

    for (const email of testEmails) {
      console.log(`\nSending to: ${email}`);
      
      const result = await emailService.sendEmail({
        to: email,
        subject: `🎉 OpenLearn - Resend Email Service Active! (${new Date().toLocaleString()})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://avatars.githubusercontent.com/u/208047818?s=200&v=4" alt="OpenLearn" style="width: 60px; height: 60px; border-radius: 10px;">
              <h1 style="color: #2c5aa0; margin: 10px 0;">OpenLearn Platform</h1>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0; font-size: 28px;">🎉 Email Service Active!</h2>
              <p style="margin: 0; font-size: 18px; opacity: 0.9;">Powered by Resend API</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #28a745; margin-top: 0;">✅ What This Means:</h3>
              <ul style="color: #333; line-height: 1.6;">
                <li>📧 Email service is now fully operational</li>
                <li>🚀 Using reliable Resend API (no more SMTP issues!)</li>
                <li>⚡ Faster and more reliable email delivery</li>
                <li>📊 Better tracking and analytics</li>
                <li>🔒 Enhanced security and deliverability</li>
              </ul>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="color: #1976d2; margin-top: 0;">📋 Service Details:</h4>
              <p style="margin: 5px 0; color: #555;"><strong>Provider:</strong> Resend API</p>
              <p style="margin: 5px 0; color: #555;"><strong>From:</strong> ${fromEmail}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Status:</strong> ✅ Operational</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                You're receiving this because the OpenLearn email service has been successfully migrated to Resend.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #888; font-size: 12px;">
                OpenLearn Platform • Email Service Test<br>
                Powered by Resend API • ${new Date().toISOString()}
              </p>
            </div>
          </div>
        `,
        text: `
🎉 OpenLearn - Email Service Active!

Great news! The OpenLearn platform's email service is now fully operational using Resend API.

✅ What This Means:
• Email service is now fully operational
• Using reliable Resend API (no more SMTP issues!)
• Faster and more reliable email delivery
• Better tracking and analytics
• Enhanced security and deliverability

📋 Service Details:
Provider: Resend API
From: ${fromEmail}
Timestamp: ${new Date().toLocaleString()}
Status: ✅ Operational

You're receiving this because the OpenLearn email service has been successfully migrated to Resend.

OpenLearn Platform • Email Service Test
Powered by Resend API • ${new Date().toISOString()}
        `
      });

      if (result.success) {
        console.log(`✅ Success! Message ID: ${result.messageId}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }

    // Test bulk email sending
    console.log('\n📬 Testing bulk email sending...');
    const bulkResult = await emailService.sendBulkEmails([
      {
        to: 'chahat.try@gmail.com',
        subject: 'Bulk Email Test 1 - OpenLearn Resend',
        html: '<h2>Bulk Email Test 1</h2><p>This is a bulk email test using Resend API.</p>'
      },
      {
        to: 'chahat.album@gmail.com',
        subject: 'Bulk Email Test 2 - OpenLearn Resend',
        html: '<h2>Bulk Email Test 2</h2><p>This is another bulk email test using Resend API.</p>'
      }
    ]);

    console.log(`\n📊 Bulk Email Results:`);
    console.log(`Total Sent: ${bulkResult.totalSent}`);
    console.log(`Total Failed: ${bulkResult.totalFailed}`);
    console.log(`Overall Success: ${bulkResult.success ? '✅' : '❌'}`);

    // Display service configuration
    console.log('\n⚙️ Service Configuration:');
    const config = emailService.getConfig();
    console.log(JSON.stringify(config, null, 2));

    console.log('\n🎉 Resend integration test completed successfully!');
    console.log('\n🔧 Next steps:');
    console.log('1. Update production environment with RESEND_API_KEY');
    console.log('2. Deploy the updated service');
    console.log('3. Test email endpoints in production');
    console.log('4. Update documentation');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testResendIntegration().catch(console.error);
}

export { testResendIntegration };
