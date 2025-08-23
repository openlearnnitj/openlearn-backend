"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function resetGrandPathfinderPassword() {
    try {
        console.log('Resetting GRAND_PATHFINDER password...\n');
        // Find the grand pathfinder
        const grandPathfinder = await prisma.user.findFirst({
            where: {
                role: 'GRAND_PATHFINDER'
            }
        });
        if (!grandPathfinder) {
            console.log('❌ No GRAND_PATHFINDER found in database');
            return;
        }
        console.log(`Found GRAND_PATHFINDER: ${grandPathfinder.email}`);
        // Hash new password
        const newPassword = 'grandpassword123';
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 12);
        // Update password
        await prisma.user.update({
            where: {
                id: grandPathfinder.id
            },
            data: {
                password: hashedPassword,
                status: 'ACTIVE'
            }
        });
        console.log('✅ Password updated successfully!');
        console.log(`Email: ${grandPathfinder.email}`);
        console.log(`Password: ${newPassword}`);
        console.log(`Status: ACTIVE`);
        await prisma.$disconnect();
    }
    catch (error) {
        console.error('Error updating password:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}
resetGrandPathfinderPassword();
