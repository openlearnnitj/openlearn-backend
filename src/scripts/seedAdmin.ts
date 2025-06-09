// filepath: /src/scripts/seedAdmin.ts
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PasswordUtils } from '../utils/password';

const prisma = new PrismaClient();

async function createGrandPathfinder() {
  try {
    console.log('🔍 Checking if Grand Pathfinder already exists...');
    
    // Check if Grand Pathfinder already exists
    const existingGrandPathfinder = await prisma.user.findFirst({
      where: {
        role: 'GRAND_PATHFINDER'
      }
    });

    if (existingGrandPathfinder) {
      console.log('✅ Grand Pathfinder already exists:', existingGrandPathfinder.email);
      console.log('📧 Email:', existingGrandPathfinder.email);
      console.log('👤 Name:', existingGrandPathfinder.name);
      console.log('🎭 Role:', existingGrandPathfinder.role);
      console.log('📊 Status:', existingGrandPathfinder.status);
      return;
    }

    console.log('👑 Creating Grand Pathfinder user...');

    // Create the Grand Pathfinder
    const hashedPassword = await PasswordUtils.hashPassword('SecurePass123!');
    
    const grandPathfinder = await prisma.user.create({
      data: {
        email: 'admin@openlearn.com',
        password: hashedPassword,
        name: 'Grand Pathfinder Admin',
        role: UserRole.GRAND_PATHFINDER,
        status: UserStatus.ACTIVE, // Grand Pathfinder is auto-approved
        twitterHandle: '@openlearn_admin',
        linkedinUrl: 'https://linkedin.com/company/openlearn',
        githubUsername: 'openlearn-admin'
      }
    });

    console.log('✅ Grand Pathfinder created successfully!');
    console.log('📧 Email: admin@openlearn.com');
    console.log('🔑 Password: SecurePass123!');
    console.log('👤 Name:', grandPathfinder.name);
    console.log('🆔 User ID:', grandPathfinder.id);
    console.log('🎭 Role:', grandPathfinder.role);
    console.log('📊 Status:', grandPathfinder.status);
    
    // Create audit log for this action
    await prisma.auditLog.create({
      data: {
        userId: grandPathfinder.id,
        action: 'USER_CREATED',
        description: 'Grand Pathfinder account created during system initialization',
        metadata: {
          role: grandPathfinder.role,
          status: grandPathfinder.status,
          createdBy: 'SYSTEM_SEED'
        }
      }
    });

    console.log('📝 Audit log created for Grand Pathfinder creation');

  } catch (error) {
    console.error('❌ Error creating Grand Pathfinder:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createGrandPathfinder();
}

export { createGrandPathfinder };
