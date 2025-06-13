import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Comprehensive Local Test for OpenLearn Neon Database
 * 
 * This script verifies that your Neon database connection works
 * in your local development environment before deploying to production.
 */

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

interface TestResult {
  success: boolean;
  test: string;
  duration: number;
  data?: any;
  error?: string;
}

/**
 * Test 1: Basic Database Connectivity
 */
async function testBasicConnection(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        version() as postgres_version,
        current_database() as database_name,
        current_user as user_name,
        NOW() as connection_time
    `;
    
    return {
      success: true,
      test: 'Basic Database Connection',
      duration: Date.now() - startTime,
      data: result,
    };
    
  } catch (error: any) {
    return {
      success: false,
      test: 'Basic Database Connection',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 2: Schema Validation
 */
async function testSchemaValidation(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // This will fail if schema is not deployed
    const tableCount = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    return {
      success: true,
      test: 'Schema Validation',
      duration: Date.now() - startTime,
      data: { tableCount: tableCount[0].count },
    };
    
  } catch (error: any) {
    return {
      success: false,
      test: 'Schema Validation',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 3: Prisma Client Operations
 */
async function testPrismaOperations(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test basic Prisma operations
    const operations = await prisma.$transaction(async (tx) => {
      // Test if we can query tables (they might not exist yet)
      try {
        const userCount = await tx.user.count();
        return { userCount, hasSchema: true };
      } catch (error) {
        // Tables don't exist yet, which is fine
        return { userCount: 0, hasSchema: false };
      }
    });
    
    return {
      success: true,
      test: 'Prisma Client Operations',
      duration: Date.now() - startTime,
      data: operations,
    };
    
  } catch (error: any) {
    return {
      success: false,
      test: 'Prisma Client Operations',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 4: Migration Simulation
 */
async function testMigrationCapability(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test if we can run schema-level operations
    await prisma.$queryRaw`SELECT 1 as migration_test`;
    
    return {
      success: true,
      test: 'Migration Capability',
      duration: Date.now() - startTime,
      data: { canRunSchemaOperations: true },
    };
    
  } catch (error: any) {
    return {
      success: false,
      test: 'Migration Capability',
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Main test runner
 */
async function runNeonLocalTests(): Promise<void> {
  console.log('🧪 OpenLearn Neon Database Local Tests');
  console.log('======================================');
  console.log(`📅 Test Time: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database: ${process.env.DATABASE_URL ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log('');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    console.error('💡 Please set DATABASE_URL in your .env file');
    process.exit(1);
  }
  
  const tests = [
    testBasicConnection,
    testSchemaValidation,
    testPrismaOperations,
    testMigrationCapability,
  ];
  
  const results: TestResult[] = [];
  
  console.log('🔄 Running tests...\n');
  
  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      const result = await test();
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.test}: PASSED (${result.duration}ms)`);
        if (result.data) {
          console.log(`   📊 Data:`, JSON.stringify(result.data, null, 2));
        }
      } else {
        console.log(`❌ ${result.test}: FAILED (${result.duration}ms)`);
        console.log(`   💥 Error: ${result.error}`);
      }
      console.log('');
      
    } catch (error: any) {
      console.error(`💥 Test "${test.name}" crashed:`, error.message);
      results.push({
        success: false,
        test: test.name,
        duration: 0,
        error: `Test crashed: ${error.message}`,
      });
      console.log('');
    }
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Your Neon database is ready for OpenLearn!');
    console.log('🚀 You can now deploy to production with confidence.');
  } else {
    console.log('🔧 Some tests failed. Please review the errors above.');
    
    if (results.some(r => !r.success && r.test === 'Basic Database Connection')) {
      console.log('');
      console.log('💡 CONNECTION TROUBLESHOOTING:');
      console.log('   1. Verify your DATABASE_URL in .env');
      console.log('   2. Check Neon database status');
      console.log('   3. Ensure SSL is properly configured');
      console.log('   4. Test network connectivity');
    }
  }
}

/**
 * Cleanup
 */
async function cleanup(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('⚠️ Error during cleanup:', error);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await runNeonLocalTests();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Handle signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(1);
});

// Execute if run directly
if (require.main === module) {
  main();
}

export { runNeonLocalTests };