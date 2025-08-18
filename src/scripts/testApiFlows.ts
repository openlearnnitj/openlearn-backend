#!/usr/bin/env ts-node

/**
 * Automated API Testing Script for OpenLearn Backend
 * 
 * This script automates common development workflows:
 * - User registration and approval flows
 * - Authentication and token management
 * - Migration testing
 * - Email verification flows
 * - PathfinderScope testing
 * 
 * Usage:
 * npm run test:flows
 * npm run test:flows -- --flow=migration
 * npm run test:flows -- --flow=registration
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface UserTokens {
  accessToken: string;
  refreshToken: string;
  user: any;
}

class ApiTester {
  private adminToken: string = '';
  private userToken: string = '';
  private testUser: any = null;

  constructor() {
    console.log(chalk.blue('🚀 OpenLearn API Flow Tester\n'));
  }

  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios({
        method,
        url: `${BASE_URL}${endpoint}`,
        data,
        headers,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
    };
    console.log(colors[type](`${message}`));
  }

  private logResponse(response: ApiResponse, action: string) {
    if (response.success) {
      this.log(`✅ ${action} successful`, 'success');
      if (response.data) {
        console.log('   Data:', JSON.stringify(response.data, null, 2));
      }
    } else {
      this.log(`❌ ${action} failed: ${response.error}`, 'error');
    }
    console.log('');
  }

  async loginAsAdmin(): Promise<boolean> {
    this.log('🔐 Logging in as admin...', 'info');
    
    const response = await this.request<UserTokens>('POST', '/auth/login', {
      email: 'admin@openlearn.org.in',
      password: 'admin123!',
    });

    this.logResponse(response, 'Admin login');
    
    if (response.success && response.data) {
      this.adminToken = response.data.accessToken;
      return true;
    }
    return false;
  }

  async registerNewUser(): Promise<boolean> {
    this.log('👤 Registering new test user...', 'info');
    
    const timestamp = Date.now();
    const testEmail = `test.user.${timestamp}@example.com`;
    
    const response = await this.request('POST', '/auth/signup', {
      name: `Test User ${timestamp}`,
      email: testEmail,
      password: 'TestUser123!',
      institute: 'Test University',
      department: 'Computer Science',
      graduationYear: 2026,
    });

    this.logResponse(response, 'User registration');
    
    if (response.success && response.data) {
      this.testUser = response.data.user;
      return true;
    }
    return false;
  }

  async approveUser(): Promise<boolean> {
    if (!this.testUser || !this.adminToken) {
      this.log('❌ Missing test user or admin token', 'error');
      return false;
    }

    this.log('✅ Approving test user as admin...', 'info');
    
    const response = await this.request(
      'PUT',
      `/admin/users/${this.testUser.id}/approve`,
      {},
      this.adminToken
    );

    this.logResponse(response, 'User approval');
    return response.success;
  }

  async loginAsUser(): Promise<boolean> {
    if (!this.testUser) {
      this.log('❌ No test user available', 'error');
      return false;
    }

    this.log('🔐 Logging in as test user...', 'info');
    
    const response = await this.request<UserTokens>('POST', '/auth/login', {
      email: this.testUser.email,
      password: 'TestUser123!',
    });

    this.logResponse(response, 'User login');
    
    if (response.success && response.data) {
      this.userToken = response.data.accessToken;
      return true;
    }
    return false;
  }

  async checkMigrationStatus(): Promise<any> {
    this.log('📊 Checking migration status...', 'info');
    
    const response = await this.request('GET', '/migration/status', {}, this.userToken);
    this.logResponse(response, 'Migration status check');
    
    return response.data;
  }

  async performMigration(): Promise<boolean> {
    this.log('🔄 Performing V2 migration...', 'info');
    
    const response = await this.request('POST', '/migration/migrate-to-v2', {
      institute: 'Test University',
      department: 'Computer Science',
      graduationYear: 2026,
      phoneNumber: '+91-9876543210',
      studentId: 'TEST001',
      discordUsername: 'testuser#1234',
      portfolioUrl: 'https://github.com/testuser',
    }, this.userToken);

    this.logResponse(response, 'V2 migration');
    return response.success;
  }

  async testEmailVerification(): Promise<boolean> {
    this.log('📧 Testing email verification flow...', 'info');
    
    // Send OTP
    const sendResponse = await this.request('POST', '/email-verification/send-otp', {}, this.userToken);
    this.logResponse(sendResponse, 'Send OTP');
    
    if (!sendResponse.success) return false;

    // Check status
    const statusResponse = await this.request('GET', '/email-verification/status', {}, this.userToken);
    this.logResponse(statusResponse, 'Email verification status');
    
    return statusResponse.success;
  }

  async testPathfinderScopes(): Promise<boolean> {
    if (!this.adminToken) return false;

    this.log('🎯 Testing PathfinderScope management...', 'info');
    
    // List scopes
    const listResponse = await this.request('GET', '/pathfinder-scopes', {}, this.adminToken);
    this.logResponse(listResponse, 'List PathfinderScopes');
    
    return listResponse.success;
  }

  async testAnalytics(): Promise<boolean> {
    if (!this.adminToken) return false;

    this.log('📈 Testing analytics endpoints...', 'info');
    
    const analyticsResponse = await this.request('GET', '/analytics/dashboard', {}, this.adminToken);
    this.logResponse(analyticsResponse, 'Analytics dashboard');
    
    return analyticsResponse.success;
  }

  // Complete flows
  async runRegistrationFlow(): Promise<void> {
    this.log(chalk.yellow('🔄 Running Registration & Approval Flow\n'));
    
    const steps = [
      () => this.loginAsAdmin(),
      () => this.registerNewUser(),
      () => this.approveUser(),
      () => this.loginAsUser(),
    ];

    for (const step of steps) {
      const success = await step();
      if (!success) {
        this.log('❌ Flow failed, stopping...', 'error');
        return;
      }
    }

    this.log('✅ Registration flow completed successfully!', 'success');
  }

  async runMigrationFlow(): Promise<void> {
    this.log(chalk.yellow('🔄 Running Migration Flow\n'));
    
    // First run registration flow if needed
    if (!this.userToken) {
      await this.runRegistrationFlow();
    }

    if (!this.userToken) {
      this.log('❌ No user token available for migration', 'error');
      return;
    }

    const migrationStatus = await this.checkMigrationStatus();
    
    if (migrationStatus?.needsMigration) {
      const success = await this.performMigration();
      if (success) {
        await this.checkMigrationStatus(); // Check final status
      }
    } else {
      this.log('ℹ️ User does not need migration', 'info');
    }
  }

  async runEmailVerificationFlow(): Promise<void> {
    this.log(chalk.yellow('🔄 Running Email Verification Flow\n'));
    
    if (!this.userToken) {
      await this.runRegistrationFlow();
    }

    if (this.userToken) {
      await this.testEmailVerification();
    }
  }

  async runAdminFlow(): Promise<void> {
    this.log(chalk.yellow('🔄 Running Admin Flow\n'));
    
    const steps = [
      () => this.loginAsAdmin(),
      () => this.testPathfinderScopes(),
      () => this.testAnalytics(),
    ];

    for (const step of steps) {
      await step();
    }
  }

  async runFullFlow(): Promise<void> {
    this.log(chalk.yellow('🔄 Running Complete API Flow Test\n'));
    
    await this.runRegistrationFlow();
    await this.runMigrationFlow();
    await this.runEmailVerificationFlow();
    await this.runAdminFlow();
    
    this.log(chalk.green('\n🎉 All flows completed!'));
  }

  // Quick test methods for development
  async quickUserTest(): Promise<void> {
    this.log(chalk.yellow('⚡ Quick User Test\n'));
    
    await this.loginAsAdmin();
    await this.registerNewUser();
    await this.approveUser();
    await this.loginAsUser();
    
    this.log(chalk.green('✅ Quick user setup complete!'));
    this.log(`User Token: ${this.userToken.substring(0, 20)}...`);
    this.log(`Admin Token: ${this.adminToken.substring(0, 20)}...`);
  }

  async quickMigrationTest(): Promise<void> {
    this.log(chalk.yellow('⚡ Quick Migration Test\n'));
    
    if (!this.userToken) {
      await this.quickUserTest();
    }
    
    await this.checkMigrationStatus();
    await this.performMigration();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const flowArg = args.find(arg => arg.startsWith('--flow='));
  const flow = flowArg ? flowArg.split('=')[1] : 'full';

  const tester = new ApiTester();

  try {
    switch (flow) {
      case 'registration':
        await tester.runRegistrationFlow();
        break;
      case 'migration':
        await tester.runMigrationFlow();
        break;
      case 'email':
        await tester.runEmailVerificationFlow();
        break;
      case 'admin':
        await tester.runAdminFlow();
        break;
      case 'quick':
        await tester.quickUserTest();
        break;
      case 'quick-migration':
        await tester.quickMigrationTest();
        break;
      case 'full':
      default:
        await tester.runFullFlow();
        break;
    }
  } catch (error) {
    console.error(chalk.red('❌ Flow failed with error:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ApiTester };
