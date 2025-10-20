// #!/usr/bin/env ts-node

// /**
//  * Simple Email Test Script
//  * Tests email functionality with Resend (current provider)
//  */

// import dotenv from 'dotenv';
// import { Resend } from 'resend';

// // Load environment variables
// dotenv.config();

// async function testResendEmail(): Promise<void> {
//   console.log('🚀 Testing Resend Email Service');
//   console.log('================================\n');

//   // Check configuration
//   const apiKey = process.env.RESEND_API_KEY;
//   const fromEmail = process.env.RESEND_FROM_EMAIL || '"OpenLearn Platform" <info@openlearn.org.in>';
  
//   if (!apiKey) {
//     console.error('❌ RESEND_API_KEY is not configured in .env file');
//     console.error('Please add your Resend API key to continue.');
//     return;
//   }

//   console.log('✅ Configuration found:');
//   console.log(`📧 From Email: ${fromEmail}`);
//   console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
//   console.log('');

//   try {
//     // Initialize Resend
//     const resend = new Resend(apiKey);
    
//     // Test 1: Send a simple email
//     console.log('📤 Sending test email...');
    
//     const emailResult = await resend.emails.send({
//       from: fromEmail,
//       to: ['www.rishiahuja@gmail.com'], // Your test email
//       subject: 'OpenLearn Email Service Test - Resend',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h1 style="color: #2563eb;">OpenLearn Email Test</h1>
//           <p>This is a test email from the OpenLearn platform using Resend.</p>
//           <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
//             <h3>Test Details:</h3>
//             <ul>
//               <li><strong>Provider:</strong> Resend</li>
//               <li><strong>Date:</strong> ${new Date().toISOString()}</li>
//               <li><strong>Test Type:</strong> Simple Email Test</li>
//             </ul>
//           </div>
//           <p>If you receive this email, the Resend integration is working correctly!</p>
//           <hr>
//           <p style="color: #6b7280; font-size: 12px;">
//             This is an automated test email from OpenLearn Platform.
//           </p>
//         </div>
//       `,
//       text: `
// OpenLearn Email Test

// This is a test email from the OpenLearn platform using Resend.

// Test Details:
// - Provider: Resend
// - Date: ${new Date().toISOString()}
// - Test Type: Simple Email Test

// If you receive this email, the Resend integration is working correctly!

// This is an automated test email from OpenLearn Platform.
//       `,
//     });

//     if (emailResult.error) {
//       console.error('❌ Email sending failed:', emailResult.error);
//       return;
//     }

//     console.log('✅ Email sent successfully!');
//     console.log(`📧 Message ID: ${emailResult.data?.id}`);
//     console.log('');

//     // Test 2: Test email to Resend's test endpoint
//     console.log('📤 Sending test email to Resend test endpoint...');
    
//     const testResult = await resend.emails.send({
//       from: fromEmail,
//       to: ['test@resend.dev'], // Resend's test endpoint
//       subject: 'OpenLearn Connection Test',
//       html: '<p>This is a connection test for OpenLearn platform.</p>',
//     });

//     if (testResult.error) {
//       console.error('❌ Test endpoint email failed:', testResult.error);
//     } else {
//       console.log('✅ Test endpoint email sent successfully!');
//       console.log(`📧 Test Message ID: ${testResult.data?.id}`);
//     }

//     console.log('');
//     console.log('🎉 Resend email service is working correctly!');
//     console.log('');
//     console.log('📋 Next Steps:');
//     console.log('1. ✅ Resend is configured and working');
//     console.log('2. 📧 Check your email inbox for the test message');
//     console.log('3. 🔄 When ready to switch to Amazon SES:');
//     console.log('   - Set EMAIL_PROVIDER=amazon_ses in .env');
//     console.log('   - Ensure SES credentials are configured');
//     console.log('   - Restart the application');

//   } catch (error: any) {
//     console.error('💥 Email test failed:', error);
//     console.error('');
//     console.error('🔧 Troubleshooting:');
//     console.error('1. Check that RESEND_API_KEY is correct');
//     console.error('2. Verify from email is configured');
//     console.error('3. Ensure internet connectivity');
//     console.error('4. Check Resend dashboard for any issues');
//   }
// }

// // Run the test
// if (require.main === module) {
//   testResendEmail().catch(console.error);
// }

// export { testResendEmail };
