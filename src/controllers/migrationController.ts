import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';
import { OLIDGenerator } from '../utils/olidGenerator';
import { AuditAction } from '@prisma/client';

export class MigrationController {
  /**
   * Check migration status for current user
   */
  static async getMigrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;

      const user = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: {
          id: true,
          migratedToV2: true,
          olid: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const needsMigration = user.migratedToV2 === null;
      const isOldUser = user.migratedToV2 === null;

      res.status(200).json({
        success: true,
        data: {
          needsMigration,
          isOldUser,
          migratedToV2: user.migratedToV2,
          hasOLID: !!user.olid,
          emailVerified: user.emailVerified,
          userSince: user.createdAt,
        },
        message: needsMigration 
          ? 'User needs migration to V2' 
          : 'User is already on V2 or migrated',
      });
    } catch (error) {
      console.error('Get migration status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Migrate user to V2 with enhanced profile data
   */
  static async migrateToV2(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;
      const {
        institute,
        department,
        graduationYear,
        phoneNumber,
        studentId,
        discordUsername,
        portfolioUrl,
      } = req.body;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ institute });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Check if user exists and needs migration
      const existingUser = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: {
          id: true,
          migratedToV2: true,
          olid: true,
          currentCohortId: true,
        },
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (existingUser.migratedToV2 === true) {
        res.status(400).json({
          success: false,
          error: 'User is already migrated to V2',
        });
        return;
      }

      // Generate OLID if not exists
      let userOlid = existingUser.olid;
      if (!userOlid) {
        userOlid = await OLIDGenerator.generateOLID();
      }

      // Assign to default active cohort if not assigned
      let currentCohortId = existingUser.currentCohortId;
      if (!currentCohortId) {
        const defaultCohort = await prisma.cohort.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        currentCohortId = defaultCohort?.id || null;
      }

      // Update user with V2 data
      const updatedUser = await prisma.user.update({
        where: { id: currentUser.userId },
        data: {
          institute: ValidationUtils.sanitizeString(institute),
          department: department ? ValidationUtils.sanitizeString(department) : null,
          graduationYear: graduationYear ? parseInt(graduationYear) : null,
          phoneNumber: phoneNumber ? ValidationUtils.sanitizeString(phoneNumber) : null,
          studentId: studentId ? ValidationUtils.sanitizeString(studentId) : null,
          discordUsername: discordUsername ? ValidationUtils.sanitizeString(discordUsername) : null,
          portfolioUrl: portfolioUrl ? ValidationUtils.sanitizeString(portfolioUrl) : null,
          olid: userOlid,
          migratedToV2: true,
          emailVerified: true, // Assume existing users are verified
          currentCohortId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          institute: true,
          department: true,
          graduationYear: true,
          phoneNumber: true,
          studentId: true,
          discordUsername: true,
          portfolioUrl: true,
          olid: true,
          migratedToV2: true,
          emailVerified: true,
          currentCohort: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.USER_MIGRATED_TO_V2,
          description: `User migrated to V2 with OLID: ${userOlid}`,
          metadata: {
            institute,
            department,
            graduationYear,
            olid: userOlid,
            migratedAt: new Date().toISOString(),
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser,
          migrationCompleted: true,
        },
        message: 'Successfully migrated to V2! Welcome to the enhanced OpenLearn platform.',
      });
    } catch (error: any) {
      console.error('Migration to V2 error:', error);
      
      // Check for OLID uniqueness error
      if (error.code === 'P2002' && error.meta?.target?.includes('olid')) {
        res.status(409).json({
          success: false,
          error: 'OLID generation conflict. Please try again.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during migration',
      });
    }
  }
}
