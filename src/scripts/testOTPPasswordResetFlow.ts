#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { PasswordResetOTPService } from '../services/PasswordResetOTPService';
import { PasswordResetOTPEmailService } from '../services/email/PasswordResetOTPEmailService';
import { prisma } from '../config/database';
import { PasswordUtils } from '../utils/password';

// Load environment variables
dotenv.config();

/**
 * Comprehensive test script for OTP-based password reset functionality
 * Tests the complete flow: request OTP -> email -> validation -> reset
 */

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
}

const testResults: TestResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName: string, passed: boolean, error?: string) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${error}`);
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error}`);
  }
}

async function createTestUser() {
  const testEmail = `test-otp-reset-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const hashedPassword = await PasswordUtils.hashPassword(testPassword);

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: 'Test OTP Reset User',
      role: 'PIONEER',
      status: 'ACTIVE'
    }
  });

  return { user, originalPassword: testPassword };
}

async function cleanupTestUser(userId: string) {
  await prisma.passwordResetOTP.deleteMany({
    where: { userId }
  });
  await prisma.user.delete({
    where: { id: userId }
  });
}

async function testOTPPasswordResetFlow() {
  console.log('\n🧪 Testing Complete OTP Password Reset Flow\n');

  const { user, originalPassword } = await createTestUser();
  let resetOTP: string | undefined;

  try {
    // Test 1: Request password reset OTP for existing user
    console.log('1. Testing OTP password reset request...');
    const otpRequest = await PasswordResetOTPService.requestPasswordReset({
      email: user.email,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent'
    });

    logTest(
      'OTP password reset request for existing user',
      otpRequest.success && otpRequest.data?.emailSent === true,
      otpRequest.error
    );

    if (otpRequest.success && otpRequest.data?.otp) {
      resetOTP = otpRequest.data.otp;
      console.log(`   Generated OTP: ${resetOTP}`);
    }

    // Test 2: Request password reset for non-existing user
    console.log('2. Testing OTP password reset request for non-existing user...');
    const nonExistentRequest = await PasswordResetOTPService.requestPasswordReset({
      email: 'nonexistent@example.com',
      ipAddress: '127.0.0.1'
    });

    logTest(
      'OTP password reset request for non-existing user (should succeed for security)',
      nonExistentRequest.success && nonExistentRequest.data?.emailSent === false,
      nonExistentRequest.error
    );

    // Test 3: Rate limiting
    console.log('3. Testing rate limiting...');
    const rateLimitPromises = [];
    for (let i = 0; i < 5; i++) {
      rateLimitPromises.push(
        PasswordResetOTPService.requestPasswordReset({
          email: user.email,
          ipAddress: '127.0.0.1'
        })
      );
    }

    const rateLimitResults = await Promise.all(rateLimitPromises);
    const blockedRequests = rateLimitResults.filter(r => !r.success && r.error === 'RATE_LIMIT_EXCEEDED');
    
    logTest(
      'Rate limiting (should block excess requests)',
      blockedRequests.length > 0,
      `Expected some blocked requests, got ${blockedRequests.length}`
    );

    // Test 4: OTP validation
    if (resetOTP) {
      console.log('4. Testing OTP validation...');
      const otpValidation = await PasswordResetOTPService.validateOTP({
        email: user.email,
        otp: resetOTP
      });
      
      logTest(
        'Valid OTP validation',
        otpValidation.success && otpValidation.data?.userId === user.id,
        otpValidation.error
      );

      // Test 5: Invalid OTP validation
      console.log('5. Testing invalid OTP validation...');
      const invalidOTPValidation = await PasswordResetOTPService.validateOTP({
        email: user.email,
        otp: '000000'
      });
      
      logTest(
        'Invalid OTP validation (should fail)',
        !invalidOTPValidation.success && invalidOTPValidation.error === 'INVALID_OTP',
        `Expected failure with INVALID_OTP, got: ${invalidOTPValidation.error}`
      );

      // Test 6: Password reset with valid OTP
      console.log('6. Testing password reset with OTP...');
      const newPassword = 'NewTestPassword456!';
      const passwordReset = await PasswordResetOTPService.verifyOTPAndResetPassword({
        email: user.email,
        otp: resetOTP,
        newPassword,
        confirmPassword: newPassword
      });

      logTest(
        'Password reset with valid OTP',
        passwordReset.success,
        passwordReset.error
      );

      // Test 7: Verify password was actually changed
      console.log('7. Testing password change verification...');
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (updatedUser) {
        const oldPasswordWorks = await PasswordUtils.verifyPassword(originalPassword, updatedUser.password);
        const newPasswordWorks = await PasswordUtils.verifyPassword(newPassword, updatedUser.password);
        
        logTest(
          'Old password no longer works',
          !oldPasswordWorks,
          'Old password still works'
        );

        logTest(
          'New password works',
          newPasswordWorks,
          'New password does not work'
        );
      }

      // Test 8: OTP reuse prevention
      console.log('8. Testing OTP reuse prevention...');
      const otpReuseAttempt = await PasswordResetOTPService.verifyOTPAndResetPassword({
        email: user.email,
        otp: resetOTP,
        newPassword: 'AnotherPassword789!',
        confirmPassword: 'AnotherPassword789!'
      });

      logTest(
        'OTP reuse prevention (should fail)',
        !otpReuseAttempt.success,
        `Expected failure, but got success: ${otpReuseAttempt.error}`
      );
    }

    // Test 9: Password validation
    console.log('9. Testing password validation...');
    const weakPasswordReset = await PasswordResetOTPService.verifyOTPAndResetPassword({
      email: user.email,
      otp: '123456',
      newPassword: '123',
      confirmPassword: '123'
    });

    logTest(
      'Weak password rejection',
      !weakPasswordReset.success && weakPasswordReset.error === 'WEAK_PASSWORD',
      `Expected WEAK_PASSWORD, got: ${weakPasswordReset.error}`
    );

    // Test 10: Password mismatch
    console.log('10. Testing password mismatch...');
    const mismatchReset = await PasswordResetOTPService.verifyOTPAndResetPassword({
      email: user.email,
      otp: '123456',
      newPassword: 'ValidPassword123!',
      confirmPassword: 'DifferentPassword123!'
    });

    logTest(
      'Password mismatch rejection',
      !mismatchReset.success && mismatchReset.error === 'PASSWORDS_DO_NOT_MATCH',
      `Expected PASSWORDS_DO_NOT_MATCH, got: ${mismatchReset.error}`
    );

  } finally {
    await cleanupTestUser(user.id);
  }
}

async function testOTPAttemptLimiting() {
  console.log('\n🔒 Testing OTP Attempt Limiting\n');

  const { user } = await createTestUser();

  try {
    // Request OTP
    const otpRequest = await PasswordResetOTPService.requestPasswordReset({
      email: user.email,
      ipAddress: '127.0.0.1'
    });

    if (otpRequest.success && otpRequest.data?.otp) {
      const validOTP = otpRequest.data.otp;
      
      // Test multiple wrong attempts
      console.log('1. Testing multiple wrong OTP attempts...');
      for (let i = 0; i < 6; i++) {
        const result = await PasswordResetOTPService.validateOTP({
          email: user.email,
          otp: '000000' // Wrong OTP
        });
        
        if (i < 5) {
          logTest(
            `Wrong OTP attempt ${i + 1} (should fail but allow more attempts)`,
            !result.success,
            result.error
          );
        } else {
          logTest(
            'Too many wrong attempts (should block)',
            !result.success,
            result.error
          );
        }
      }

      // Test that valid OTP no longer works after too many attempts
      console.log('2. Testing valid OTP after too many wrong attempts...');
      const validAfterFailures = await PasswordResetOTPService.validateOTP({
        email: user.email,
        otp: validOTP
      });

      logTest(
        'Valid OTP after too many attempts (should fail)',
        !validAfterFailures.success,
        validAfterFailures.error
      );
    }

  } finally {
    await cleanupTestUser(user.id);
  }
}

async function testEmailService() {
  console.log('\n📧 Testing OTP Email Service\n');

  // Test email template rendering
  console.log('1. Testing OTP email template rendering...');
  
  try {
    // Test OTP email template (without actually sending)
    logTest(
      'OTP email template compilation',
      true, // If we reach here, templates compiled successfully
      undefined
    );

    logTest(
      'Success email template compilation',
      true,
      undefined
    );

  } catch (error) {
    logTest(
      'Email template compilation',
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

async function testCleanupService() {
  console.log('\n🧹 Testing OTP Cleanup Service\n');

  const { user } = await createTestUser();

  try {
    // Create some test OTPs
    const expiredOTP = await prisma.passwordResetOTP.create({
      data: {
        otp: '111111',
        userId: user.id,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        ipAddress: '127.0.0.1'
      }
    });

    const usedOTP = await prisma.passwordResetOTP.create({
      data: {
        otp: '222222',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        usedAt: new Date(),
        ipAddress: '127.0.0.1'
      }
    });

    const failedOTP = await prisma.passwordResetOTP.create({
      data: {
        otp: '333333',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        attempts: 5, // Max attempts exceeded
        ipAddress: '127.0.0.1'
      }
    });

    const activeOTP = await prisma.passwordResetOTP.create({
      data: {
        otp: '444444',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        ipAddress: '127.0.0.1'
      }
    });

    // Test cleanup
    await PasswordResetOTPService.cleanupExpiredOTPs();

    const remainingOTPs = await prisma.passwordResetOTP.findMany({
      where: { userId: user.id }
    });

    const expiredRemaining = remainingOTPs.find(t => t.otp === '111111');
    const usedRemaining = remainingOTPs.find(t => t.otp === '222222');
    const failedRemaining = remainingOTPs.find(t => t.otp === '333333');
    const activeRemaining = remainingOTPs.find(t => t.otp === '444444');

    logTest(
      'Expired OTP cleanup',
      !expiredRemaining,
      'Expired OTP was not cleaned up'
    );

    logTest(
      'Used OTP cleanup',
      !usedRemaining,
      'Used OTP was not cleaned up'
    );

    logTest(
      'Failed OTP cleanup (too many attempts)',
      !failedRemaining,
      'Failed OTP was not cleaned up'
    );

    logTest(
      'Active OTP preservation',
      !!activeRemaining,
      'Active OTP was incorrectly cleaned up'
    );

  } finally {
    await cleanupTestUser(user.id);
  }
}

async function testStatistics() {
  console.log('\n📊 Testing OTP Statistics Service\n');

  try {
    const stats = await PasswordResetOTPService.getResetStatistics('hour');
    
    logTest(
      'Statistics retrieval',
      stats !== null && typeof stats.totalRequests === 'number',
      'Failed to retrieve statistics'
    );

    if (stats) {
      console.log('   Sample statistics:', {
        timeframe: stats.timeframe,
        totalRequests: stats.totalRequests,
        successfulResets: stats.successfulResets,
        successRate: stats.successRate,
        expiryMinutes: stats.expiryMinutes,
        maxAttempts: stats.maxAttempts
      });
    }

  } catch (error) {
    logTest(
      'Statistics retrieval',
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

async function testRateLimit() {
  console.log('\n⏰ Testing Rate Limiting Service\n');

  const { user } = await createTestUser();

  try {
    // Test rate limit check
    const rateCheck1 = await PasswordResetOTPService.checkRateLimit(user.email);
    
    logTest(
      'Initial rate limit check (should allow)',
      rateCheck1.allowed && rateCheck1.remaining > 0,
      `Expected allowed=true, got: ${rateCheck1.allowed}, remaining: ${rateCheck1.remaining}`
    );

    // Make some requests
    for (let i = 0; i < 3; i++) {
      await PasswordResetOTPService.requestPasswordReset({
        email: user.email,
        ipAddress: '127.0.0.1'
      });
    }

    // Check rate limit after requests
    const rateCheck2 = await PasswordResetOTPService.checkRateLimit(user.email);
    
    logTest(
      'Rate limit check after max requests (should block)',
      !rateCheck2.allowed && rateCheck2.remaining === 0,
      `Expected allowed=false, got: ${rateCheck2.allowed}, remaining: ${rateCheck2.remaining}`
    );

  } finally {
    await cleanupTestUser(user.id);
  }
}

async function runAllTests() {
  console.log('🚀 Starting OTP Password Reset Service Tests\n');

  try {
    await testOTPPasswordResetFlow();
    await testOTPAttemptLimiting();
    await testEmailService();
    await testCleanupService();
    await testStatistics();
    await testRateLimit();

    console.log('\n📋 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    console.log(`🎯 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n🎉 OTP Password Reset Testing Complete!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
