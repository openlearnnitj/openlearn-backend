#!/usr/bin/env ts-node

/**
 * Quick Database Reset and Seed Script
 * 
 * This script quickly resets the database and seeds it with test data
 * for rapid development iteration.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import chalk from 'chalk';

const prisma = new PrismaClient();

async function quickReset() {
  console.log(chalk.blue('🔄 Quick Database Reset & Seed\n'));

  try {
    // Reset database
    console.log(chalk.yellow('📦 Resetting database...'));
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

    // Run seeding
    console.log(chalk.yellow('🌱 Seeding development data...'));
    execSync('npm run seed:dev', { stdio: 'inherit' });

    console.log(chalk.green('\n✅ Database reset and seeded successfully!'));
    console.log(chalk.blue('\n📋 Available Test Accounts:'));
    console.log('   Admin: admin@openlearn.org.in / admin123!');
    console.log('   Developer: developer@openlearn.org.in / dev123!');
    console.log('   Pioneer: test.pioneer@openlearn.org.in / pioneer123!');

  } catch (error) {
    console.error(chalk.red('❌ Reset failed:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  quickReset();
}
