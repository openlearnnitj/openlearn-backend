#!/usr/bin/env node
/**
 * Enhanced Email Debug Script for Production
 * 
 * This script helps debug email delivery issues in production by:
 * 1. Testing email service configuration
 * 2. Checking Resend API connectivity
 * 3. Testing template loading
 * 4. Sending test emails
 * 5. Providing detailed logging
 */

import { PasswordResetOTPEmailService } from '../services/email/PasswordResetOTPEmailService';
import { SMTPService } from '../services/email/SMTPService';
import path from 'path';
import fs from 'fs/promises';

// Enhanced logging with timestamps
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const info = (message: string, data?: any) => log('INFO', message, data);
const warn = (message: string, data?: any) => log('WARN', message, data);
const error = (message: string, data?: any) => log('ERROR', message, data);
const success = (message: string, data?: any) => log('SUCCESS', message, data);

async function debugEmailConfiguration() {
  info('🔍 Starting Email Configuration Debug');
  
  // Check environment variables
  const requiredEnvVars = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'SMTP_FROM_NAME'
  ];
  
  const envCheck: Record<string, string | undefined> = {};
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    envCheck[envVar] = value ? `${value.substring(0, 10)}...` : 'NOT SET';
    
    if (!value) {
      error(`❌ Missing environment variable: ${envVar}`);
    } else {
      success(`✅ Environment variable ${envVar} is set`);
    }
  }
  
  info('Environment Variables Check:', envCheck);
  
  return requiredEnvVars.every(envVar => process.env[envVar]);
}

async function testResendConnection() {
  info('🌐 Testing Resend API Connection');
  
  try {
    const smtpService = new SMTPService();
    const result = await smtpService.testConnection();
    
    if (result.success) {
      success('✅ Resend API connection successful');
    } else {
      error('❌ Resend API connection failed', result);
    }
    
    return result.success;
  } catch (err) {
    error('💥 Resend API test error', err);
    return false;
  }
}

async function testTemplateLoading() {
  info('📄 Testing Email Template Loading');
  
  try {
    // Check multiple possible template paths
    const possiblePaths = [
      path.join(__dirname, '../templates/email/password-reset-otp.html'),
      path.join(__dirname, '../../templates/email/password-reset-otp.html'),
      path.join(process.cwd(), 'src/templates/email/password-reset-otp.html'),
      path.join(process.cwd(), 'templates/email/password-reset-otp.html')
    ];
    
    let templatePath = '';
    let templateContent = '';
    
    // Try each path until we find the template
    for (const tryPath of possiblePaths) {
      try {
        info(`Trying template path: ${tryPath}`);
        templateContent = await fs.readFile(tryPath, 'utf-8');
        templatePath = tryPath;
        success(`✅ Template found at: ${templatePath}`);
        break;
      } catch (pathError) {
        warn(`Template not found at: ${tryPath}`);
      }
    }
    
    if (!templateContent) {
      error('❌ Template file not found in any expected location');
      info('Expected template locations:', possiblePaths);
      return false;
    }
    
    success('✅ Template file loaded successfully');
    info(`Template size: ${templateContent.length} characters`);
    
    // Check if template has required placeholders
    const requiredPlaceholders = ['{{userName}}', '{{otp}}', '{{expiryTime}}'];
    const missingPlaceholders = requiredPlaceholders.filter(
      placeholder => !templateContent.includes(placeholder)
    );
    
    if (missingPlaceholders.length === 0) {
      success('✅ All required placeholders found in template');
    } else {
      warn('⚠️ Missing placeholders in template', missingPlaceholders);
    }
    
    return true;
  } catch (err) {
    error('💥 Template loading test error', err);
    return false;
  }
}

async function sendTestEmail(email: string) {
  info(`📧 Sending test password reset email to: ${email}`);
  
  try {
    const testData = {
      userName: 'Test User (Debug)',
      userEmail: email,
      otp: '123456',
      requestTime: new Date().toLocaleString(),
      expiryTime: new Date(Date.now() + 10 * 60 * 1000).toLocaleString(),
      expiryMinutes: 10,
      ipAddress: '127.0.0.1'
    };

    info('Test email data:', testData);
    
    const result = await PasswordResetOTPEmailService.sendPasswordResetOTP(testData);
    
    if (result.success) {
      success('✅ Test email sent successfully!', {
        messageId: result.messageId,
        recipient: email
      });
    } else {
      error('❌ Test email failed', {
        error: result.error,
        recipient: email
      });
    }
    
    return result;
  } catch (err) {
    error('💥 Test email error', err);
    return { success: false, error: err };
  }
}

async function checkRecentLogs() {
  info('📊 Checking recent application logs for email-related entries');
  
  try {
    const { execSync } = await import('child_process');
    
    // Try different log locations
    const logCommands = [
      'docker logs openlearn-backend-app-1 --tail=50 2>/dev/null | grep -i "email\\|smtp\\|resend" || echo "No Docker logs found"',
      'journalctl -u openlearn-backend --lines=50 --no-pager 2>/dev/null | grep -i "email\\|smtp\\|resend" || echo "No systemd logs found"',
      'tail -n 50 /var/log/openlearn/*.log 2>/dev/null | grep -i "email\\|smtp\\|resend" || echo "No file logs found"'
    ];
    
    for (const command of logCommands) {
      try {
        const output = execSync(command, { encoding: 'utf-8', timeout: 5000 });
        if (output && !output.includes('No ') && output.trim()) {
          info('Recent email-related log entries:', output);
        }
      } catch (cmdError) {
        // Ignore individual command errors
      }
    }
  } catch (err) {
    warn('⚠️ Could not check logs automatically', err);
  }
}

async function runComprehensiveDebug() {
  const email = process.argv[2];
  
  if (!email) {
    error('❌ Please provide an email address as an argument');
    error('Usage: npm run debug-email test@example.com');
    process.exit(1);
  }
  
  info('🚀 Starting Comprehensive Email Debug Session');
  info(`Target email: ${email}`);
  info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  info(`Timestamp: ${new Date().toISOString()}`);
  
  const results = {
    configValid: false,
    connectionWorking: false,
    templateLoaded: false,
    testEmailSent: false
  };
  
  try {
    // Step 1: Check configuration
    results.configValid = await debugEmailConfiguration();
    
    if (!results.configValid) {
      error('💀 Configuration check failed. Please fix environment variables first.');
      return;
    }
    
    // Step 2: Test Resend connection
    results.connectionWorking = await testResendConnection();
    
    if (!results.connectionWorking) {
      error('💀 Resend API connection failed. Check your API key and network.');
      return;
    }
    
    // Step 3: Test template loading
    results.templateLoaded = await testTemplateLoading();
    
    if (!results.templateLoaded) {
      warn('⚠️ Template loading issues detected. Emails may fail.');
    }
    
    // Step 4: Send test email
    const emailResult = await sendTestEmail(email);
    results.testEmailSent = emailResult.success;
    
    // Step 5: Check recent logs
    await checkRecentLogs();
    
    // Summary
    info('📋 Debug Session Summary:', results);
    
    if (results.testEmailSent) {
      success('🎉 Email debug session completed successfully!');
      info('💡 If the test email was sent but users still don\'t receive emails, check:');
      info('   1. Spam/junk folders');
      info('   2. Email server logs');
      info('   3. Resend dashboard for delivery status');
      info('   4. Domain reputation issues');
    } else {
      error('💀 Email debug session found issues. Please review the errors above.');
    }
    
  } catch (err) {
    error('💥 Debug session crashed', err);
  }
}

// Production Log Monitor
async function monitorEmailLogs() {
  info('📊 Starting real-time email log monitoring...');
  info('Press Ctrl+C to stop monitoring');
  
  try {
    const { spawn } = await import('child_process');
    
    // Try to monitor Docker logs
    const dockerMonitor = spawn('docker', ['logs', 'openlearn-backend-app-1', '-f'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    dockerMonitor.stdout?.on('data', (data) => {
      const line = data.toString();
      if (line.match(/email|smtp|resend|password.*reset/i)) {
        info('📧 Email Log:', line.trim());
      }
    });
    
    dockerMonitor.stderr?.on('data', (data) => {
      const line = data.toString();
      if (line.match(/email|smtp|resend|password.*reset/i)) {
        error('📧 Email Error:', line.trim());
      }
    });
    
    dockerMonitor.on('error', () => {
      warn('⚠️ Docker monitoring failed, trying alternative methods...');
      // Fallback to other monitoring methods
    });
    
  } catch (err) {
    error('💥 Log monitoring setup failed', err);
  }
}

// Main execution
const command = process.argv[2];

if (command === 'monitor') {
  monitorEmailLogs();
} else {
  runComprehensiveDebug();
}

export {
  debugEmailConfiguration,
  testResendConnection,
  testTemplateLoading,
  sendTestEmail,
  checkRecentLogs
};
