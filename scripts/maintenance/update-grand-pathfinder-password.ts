import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updateGrandPathfinderPassword() {
    try {
        const newPassword = 'GrandPath123!';
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        const updatedUser = await prisma.user.update({
            where: {
                email: 'grand.pathfinder@openlearn.org.in'
            },
            data: {
                password: hashedPassword
            }
        });
        
        console.log('✅ Password updated successfully for:', updatedUser.email);
        console.log('🔑 New password: GrandPath123!');
        
    } catch (error) {
        console.error('❌ Error updating password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateGrandPathfinderPassword();
