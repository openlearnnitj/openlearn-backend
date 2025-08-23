"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function updateGrandPathfinderPassword() {
    try {
        const newPassword = 'GrandPath123!';
        const saltRounds = 12;
        const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
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
    }
    catch (error) {
        console.error('❌ Error updating password:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
updateGrandPathfinderPassword();
