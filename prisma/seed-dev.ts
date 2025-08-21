import { PrismaClient, UserRole, UserStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcrypt';
import { OLIDGenerator } from '../src/utils/olidGenerator';

const prisma = new PrismaClient();

/**
 * Admin Seeding Script for OpenLearn Development Environment
 * 
 * This script creates essential admin users, cohorts, and pathfinder scopes
 * needed for development and testing.
 */

const ADMIN_USERS = [
  {
    email: 'admin@openlearn.org.in',
    name: 'OpenLearn Admin',
    password: 'admin123!',
    role: UserRole.PATHFINDER,
    institute: 'OpenLearn Organization',
    department: 'Administration',
    graduationYear: 2024,
    phoneNumber: '+91-9999999999',
    studentId: 'ADMIN001',
    discordUsername: 'openlearn_admin#0001',
    portfolioUrl: 'https://openlearn.org.in',
  },
  {
    email: 'developer@openlearn.org.in',
    name: 'Developer Test Account',
    password: 'dev123!',
    role: UserRole.PATHFINDER,
    institute: 'OpenLearn Development',
    department: 'Software Engineering',
    graduationYear: 2025,
    phoneNumber: '+91-8888888888',
    studentId: 'DEV001',
    discordUsername: 'openlearn_dev#0001',
    portfolioUrl: 'https://github.com/openlearn',
  },
  {
    email: 'test.pioneer@openlearn.org.in',
    name: 'Test Pioneer',
    password: 'pioneer123!',
    role: UserRole.PIONEER,
    institute: 'Test University',
    department: 'Computer Science',
    graduationYear: 2026,
    phoneNumber: '+91-7777777777',
    studentId: 'TEST001',
    discordUsername: 'test_pioneer#0001',
    portfolioUrl: 'https://test-portfolio.com',
  },
];

const DEFAULT_COHORTS = [
  {
    name: 'Development Cohort 2025',
    description: 'Default cohort for development and testing',
    isActive: true,
    autoApprove: true,
    maxEnrollments: 1000,
  },
  {
    name: 'Beta Testing Cohort',
    description: 'Cohort for beta testing new features',
    isActive: true,
    autoApprove: false,
    maxEnrollments: 100,
  },
];

/**
 * Since PathfinderScope is a relationship-based model in the current schema,
 * we'll handle scope assignment differently - by creating scopes for specific
 * pathfinders and cohorts during the user assignment phase.
 */

async function seedPathfinderScopes() {
  console.log('🌱 Setting up PathfinderScopes...');
  console.log('   PathfinderScopes will be created when assigning users to cohorts');
  // The actual scope creation happens in assignPathfinderScopes()
}

async function assignPathfinderScopes() {
  console.log('🌱 Assigning PathfinderScopes to Pathfinder users...');
  
  const defaultCohort = await prisma.cohort.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!defaultCohort) {
    console.log('❌ No active cohort found, skipping scope assignment...');
    return;
  }

  const pathfinders = await prisma.user.findMany({
    where: { 
      role: UserRole.PATHFINDER,
    },
  });

  for (const pathfinder of pathfinders) {
    // Check if scope already exists
    const existingScope = await prisma.pathfinderScope.findFirst({
      where: {
        pathfinderId: pathfinder.id,
        cohortId: defaultCohort.id,
      },
    });

    if (existingScope) {
      console.log(`✅ PathfinderScope already exists for: ${pathfinder.email}`);
      continue;
    }

    // Create admin scope for pathfinder
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@openlearn.org.in' },
    });

    if (!adminUser) {
      console.log('❌ Admin user not found, skipping scope creation...');
      continue;
    }

    const scope = await prisma.pathfinderScope.create({
      data: {
        pathfinderId: pathfinder.id,
        cohortId: defaultCohort.id,
        canManageUsers: true,
        canViewAnalytics: true,
        canCreateContent: true,
        assignedById: adminUser.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: pathfinder.id,
        action: AuditAction.PATHFINDER_SCOPE_ASSIGNED,
        description: `PathfinderScope assigned via seeding for cohort: ${defaultCohort.name}`,
        metadata: {
          scopeId: scope.id,
          cohortId: defaultCohort.id,
          cohortName: defaultCohort.name,
          assignedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Assigned PathfinderScope to: ${pathfinder.email}`);
  }
}

async function assignUsersToDefaultCohort() {
  console.log('🌱 Assigning users to default active cohort...');
  
  const defaultCohort = await prisma.cohort.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!defaultCohort) {
    console.log('❌ No active cohort found, skipping assignment...');
    return;
  }

  const usersWithoutCohort = await prisma.user.findMany({
    where: { currentCohortId: null },
  });

  for (const user of usersWithoutCohort) {
    await prisma.user.update({
      where: { id: user.id },
      data: { currentCohortId: defaultCohort.id },
    });

    console.log(`✅ Assigned ${user.email} to cohort: ${defaultCohort.name}`);
  }
}

async function seedAdminUsers() {
  console.log('🌱 Seeding admin users...');
  
  for (const userData of ADMIN_USERS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`✅ User ${userData.email} already exists, skipping...`);
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Generate OLID
    const olid = await OLIDGenerator.generateOLID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        institute: userData.institute,
        department: userData.department,
        graduationYear: userData.graduationYear,
        phoneNumber: userData.phoneNumber,
        studentId: userData.studentId,
        discordUsername: userData.discordUsername,
        portfolioUrl: userData.portfolioUrl,
        olid,
        emailVerified: true,
        migratedToV2: true,
        status: UserStatus.ACTIVE,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_CREATED,
        description: `Admin user created via seeding script: ${userData.name}`,
        metadata: {
          email: userData.email,
          role: userData.role,
          olid,
          seededAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Created admin user: ${userData.email} (${userData.role})`);
    console.log(`   OLID: ${olid}`);
    console.log(`   Password: ${userData.password}`);
  }
}

async function seedCohorts() {
  console.log('🌱 Seeding default cohorts...');
  
  for (const cohortData of DEFAULT_COHORTS) {
    const existingCohort = await prisma.cohort.findFirst({
      where: { name: cohortData.name },
    });

    if (existingCohort) {
      console.log(`✅ Cohort "${cohortData.name}" already exists, skipping...`);
      continue;
    }

    const cohort = await prisma.cohort.create({
      data: cohortData,
    });

    console.log(`✅ Created cohort: ${cohort.name} (${cohort.id})`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting OpenLearn Development Environment Seeding...\n');

    // Seed in order
    await seedCohorts();
    await seedPathfinderScopes();
    await seedAdminUsers();
    await assignPathfinderScopes();
    await assignUsersToDefaultCohort();

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Admin users created with default passwords');
    console.log('   - Default cohorts and PathfinderScopes created');
    console.log('   - All users assigned to appropriate scopes and cohorts');
    console.log('\n🔐 Default Login Credentials:');
    console.log('   Admin: admin@openlearn.org.in / admin123!');
    console.log('   Developer: developer@openlearn.org.in / dev123!');
    console.log('   Pioneer: test.pioneer@openlearn.org.in / pioneer123!');
    console.log('\n🌐 Adminer Database UI: http://localhost:8080');
    console.log('   Server: postgres');
    console.log('   Username: postgres');
    console.log('   Password: openlearn_dev_password');
    console.log('   Database: openlearn_dev');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  main();
}

export { main as seedDevelopmentData };
