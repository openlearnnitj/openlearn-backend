import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGoDaddySMTP(): Promise<void> {
  console.log('🚀 GoDaddy SMTP Configuration Test');
  console.log('═'.repeat(60));
  
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
  const user = process.env.SMTP_USER || 'info@openlearn.org.in';
  
  console.log(`\n📧 Credentials:`);
  console.log(`User: ${user}`);
  console.log(`Pass: ${password} (length: ${password.length})`);
  console.log(`Pass starts with '?': ${password.startsWith('?')}`);
  
  // GoDaddy SMTP configurations to try
  const configurations = [
    {
      name: 'GoDaddy Standard (Port 587, STARTTLS)',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: user,
          pass: password
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'GoDaddy SSL (Port 465)',
      config: {
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
          user: user,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'GoDaddy with requireTLS',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: user,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'GoDaddy Relaxed TLS',
      config: {
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: user,
          pass: password
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1'
        },
        ignoreTLS: false
      }
    },
    {
      name: 'GoDaddy Alternative Host (relay-hosting)',
      config: {
        host: 'relay-hosting.secureserver.net',
        port: 25,
        secure: false,
        auth: {
          user: user,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];

  for (const { name, config } of configurations) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log('─'.repeat(50));
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Secure: ${config.secure}`);
    
    try {
      const transporter = nodemailer.createTransport(config as any);
      
      console.log('🔍 Verifying connection...');
      await transporter.verify();
      console.log('✅ Connection verification successful!');
      
      // Try sending test email
      console.log('📧 Sending test email...');
      const result = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'OpenLearn Platform'}" <${user}>`,
        to: 'www.rishiahuja@gmail.com',
        subject: `OpenLearn SMTP Test - ${name} - ${new Date().toISOString()}`,
        html: `
          <h2>🎉 Success! SMTP Configuration Working</h2>
          <p><strong>Configuration:</strong> ${name}</p>
          <p><strong>Host:</strong> ${config.host}</p>
          <p><strong>Port:</strong> ${config.port}</p>
          <p><strong>Secure:</strong> ${config.secure}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p>This configuration works for OpenLearn backend!</p>
        `,
        text: `Success! SMTP Configuration Working\n\nConfiguration: ${name}\nHost: ${config.host}\nPort: ${config.port}\nSecure: ${config.secure}\nTimestamp: ${new Date().toLocaleString()}\n\nThis configuration works for OpenLearn backend!`
      });
      
      console.log('✅ Email sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      
      console.log(`\n🎉 SUCCESS! Configuration "${name}" works!`);
      console.log('📋 Working configuration:');
      console.log(JSON.stringify(config, null, 2));
      
      // Test with all email addresses
      await sendToAllEmails(transporter, name);
      return; // Exit on first success
      
    } catch (error: any) {
      console.log('❌ Failed:');
      console.log(`Error: ${error.message}`);
      if (error.code) console.log(`Code: ${error.code}`);
      if (error.response) console.log(`Response: ${error.response}`);
      
      // Specific troubleshooting for common errors
      if (error.message.includes('535')) {
        console.log('💡 Authentication failed - checking credentials...');
        console.log(`   User: "${user}"`);
        console.log(`   Pass length: ${password.length}`);
        console.log(`   Pass preview: ${password.substring(0, 3)}...${password.substring(password.length - 3)}`);
      }
    }
  }
  
  console.log('\n❌ All configurations failed. Let\'s try additional troubleshooting...');
  await additionalTroubleshooting();
}

async function sendToAllEmails(transporter: nodemailer.Transporter, configName: string): Promise<void> {
  const testEmails = [
    'www.rishiahuja@gmail.com',
    'rishia2220@gmail.com',
    'chahat.create@gmail.com',
    'chahat.try@gmail.com',
    'chahat.album@gmail.com',
    'ckesharwani4@gmail.com',
    'ckesharwani5115@gmail.com'
  ];
  
  console.log('\n📬 Sending to all test emails...');
  
  for (const email of testEmails) {
    try {
      const result = await transporter.sendMail({
        from: `"OpenLearn Platform" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🎉 OpenLearn Email Service - Now Working!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c5aa0;">🎉 OpenLearn Email Service is Operational!</h2>
            
            <p>Great news! The OpenLearn platform's email service is now fully functional.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #28a745; margin-top: 0;">✅ Configuration Details:</h3>
              <ul>
                <li><strong>Method:</strong> ${configName}</li>
                <li><strong>Status:</strong> Successfully Connected</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p>You can now expect to receive:</p>
            <ul>
              <li>📧 Account verification emails</li>
              <li>🔔 Important notifications</li>
              <li>📚 Course updates</li>
              <li>🏆 Achievement notifications</li>
            </ul>
            
            <p>Welcome to the OpenLearn community!</p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is a test email from OpenLearn Backend.<br>
              Contact: info@openlearn.org.in
            </p>
          </div>
        `
      });
      
      console.log(`✅ ${email} - Success (${result.messageId})`);
      
    } catch (error: any) {
      console.log(`❌ ${email} - Failed: ${error.message}`);
    }
  }
}

async function additionalTroubleshooting(): Promise<void> {
  console.log('\n🔍 Additional Troubleshooting...');
  console.log('─'.repeat(50));
  
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
  const user = process.env.SMTP_USER || '';
  
  console.log('📝 Credential Analysis:');
  console.log(`Username: "${user}"`);
  console.log(`Password length: ${password.length}`);
  console.log(`Password chars: ${password.split('').map(c => c.charCodeAt(0)).join(',')}`);
  console.log(`Password starts with ?: ${password.startsWith('?')}`);
  console.log(`Password contains special chars: ${/[!@#$%^&*(),.?":{}|<>]/.test(password)}`);
  
  // Test with URL encoded password
  const encodedPassword = encodeURIComponent(password);
  if (encodedPassword !== password) {
    console.log(`\n🔧 Trying URL encoded password: ${encodedPassword}`);
    
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
          user: user,
          pass: encodedPassword
        },
        tls: { rejectUnauthorized: false }
      });
      
      await transporter.verify();
      console.log('✅ URL encoded password works!');
      
    } catch (error: any) {
      console.log(`❌ URL encoded password failed: ${error.message}`);
    }
  }
  
  // Suggestions
  console.log('\n💡 Next Steps:');
  console.log('1. Verify the email account exists and is active');
  console.log('2. Check if 2FA is enabled (may require app password)');
  console.log('3. Verify with GoDaddy support about SMTP requirements');
  console.log('4. Try logging into webmail with these credentials');
  console.log('5. Check if the account requires additional authentication setup');
}

// Run the test
if (require.main === module) {
  testGoDaddySMTP().catch(console.error);
}

export { testGoDaddySMTP };
