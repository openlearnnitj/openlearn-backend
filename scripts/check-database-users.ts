import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        console.log('Checking all users in the database...\n');
        
        const users = await prisma.user.findMany({
            include: {
                pathfinderScopes: {
                    include: {
                        league: true
                    }
                }
            }
        });

        console.log(`Found ${users.length} users:\n`);

        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log(`  ID: ${user.id}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Status: ${user.status}`);
            console.log(`  Email Verified: ${user.emailVerified}`);
            console.log(`  Institute: ${user.institute || 'Not set'}`);
            console.log(`  Department: ${user.department || 'Not set'}`);
            
            if (user.pathfinderScopes && user.pathfinderScopes.length > 0) {
                console.log(`  Pathfinder Scopes: ${user.pathfinderScopes.length}`);
                user.pathfinderScopes.forEach((scope, idx) => {
                    console.log(`    Scope ${idx + 1}: ${scope.league.name} (${scope.league.id})`);
                });
            } else {
                console.log(`  Pathfinder Scopes: None`);
            }
            console.log('');
        });

        // Check for GRAND_PATHFINDER specifically
        const grandPathfinder = users.find(u => u.role === 'GRAND_PATHFINDER');
        if (grandPathfinder) {
            console.log('GRAND_PATHFINDER found:');
            console.log(`  Email: ${grandPathfinder.email}`);
            console.log(`  Name: ${grandPathfinder.name}`);
            console.log(`  ID: ${grandPathfinder.id}`);
            console.log(`  Status: ${grandPathfinder.status}`);
        } else {
            console.log('No GRAND_PATHFINDER found in the database.');
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error checking users:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

checkUsers();
