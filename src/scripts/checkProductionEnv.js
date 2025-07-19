#!/usr/bin/env node
/**
 * Quick Production Environment Checker
 * Verifies all critical environment variables and services are working
 */

const requiredVars = [
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'DATABASE_URL'
];

const optionalVars = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

console.log('🔍 OpenLearn Production Environment Check');
console.log('==========================================\n');

// Check required environment variables
console.log('📋 Required Environment Variables:');
let missingRequired = 0;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('URL') 
      ? `${value.substring(0, 10)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    missingRequired++;
  }
});

console.log('\n📋 Optional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('SECRET') 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET (using default)`);
  }
});

console.log('\n🔧 Quick Tests:');

// Check if Resend API key format is correct
const resendKey = process.env.RESEND_API_KEY;
if (resendKey) {
  if (resendKey.startsWith('re_')) {
    console.log('✅ RESEND_API_KEY format appears correct');
  } else {
    console.log('❌ RESEND_API_KEY format appears incorrect (should start with "re_")');
    missingRequired++;
  }
}

// Check email format
const fromEmail = process.env.RESEND_FROM_EMAIL;
if (fromEmail) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(fromEmail)) {
    console.log('✅ RESEND_FROM_EMAIL format appears correct');
  } else {
    console.log('❌ RESEND_FROM_EMAIL format appears incorrect');
    missingRequired++;
  }
}

console.log('\n📊 Summary:');
if (missingRequired === 0) {
  console.log('🎉 All critical environment variables are properly set!');
  console.log('\n📧 To test email delivery, run:');
  console.log('npm run debug:email your-email@domain.com');
  process.exit(0);
} else {
  console.log(`❌ ${missingRequired} critical issues found. Please fix them before testing email delivery.`);
  process.exit(1);
}
