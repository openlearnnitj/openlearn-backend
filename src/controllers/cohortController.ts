import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';

export class CohortController {
  /**
   * Create a new cohort
   */
  static async createCohort(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, isActive = true } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ name });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Check if cohort name already exists
      const existingCohort = await prisma.cohort.findFirst({
        where: { name: name.trim() },
      });

      if (existingCohort) {
        res.status(409).json({
          success: false,
          error: 'Cohort with this name already exists',
        });
        return;
      }

      // Create the cohort
      const cohort = await prisma.cohort.create({
        data: {
          name: ValidationUtils.sanitizeString(name),
          description: description ? ValidationUtils.sanitizeString(description) : null,
          isActive,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'COHORT_CREATED',
          description: `Created cohort: ${cohort.name}`,
          metadata: {
            cohortId: cohort.id,
            cohortName: cohort.name,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: cohort,
        message: 'Cohort created successfully',
      });
    } catch (error) {
      console.error('Create cohort error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all cohorts
   */
  static async getCohorts(req: Request, res: Response): Promise<void> {
    try {
      const { isActive, page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Build filter conditions
      const where: any = {};
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const [cohorts, total] = await Promise.all([
        prisma.cohort.findMany({
          where,
          skip,
          take,
          include: {
            specializations: {
              select: {
                id: true,
                name: true,
              },
            },
            enrollments: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                league: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                enrollments: true,
                specializations: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.cohort.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          cohorts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        message: 'Cohorts retrieved successfully',
      });
    } catch (error) {
      console.error('Get cohorts error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get cohort by ID
   */
  static async getCohortById(req: Request, res: Response): Promise<void> {
    try {
      const { cohortId } = req.params;

      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        include: {
          specializations: {
            include: {
              leagues: {
                include: {
                  league: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
          enrollments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              enrolledAt: 'desc',
            },
          },
          _count: {
            select: {
              enrollments: true,
              specializations: true,
            },
          },
        },
      });

      if (!cohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: cohort,
        message: 'Cohort retrieved successfully',
      });
    } catch (error) {
      console.error('Get cohort by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update cohort
   */
  static async updateCohort(req: Request, res: Response): Promise<void> {
    try {
      const { cohortId } = req.params;
      const { name, description, isActive } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if cohort exists
      const existingCohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
      });

      if (!existingCohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found',
        });
        return;
      }

      // If name is being updated, check for duplicates
      if (name && name !== existingCohort.name) {
        const duplicateCohort = await prisma.cohort.findFirst({
          where: { 
            name: name.trim(),
            id: { not: cohortId },
          },
        });

        if (duplicateCohort) {
          res.status(409).json({
            success: false,
            error: 'Cohort with this name already exists',
          });
          return;
        }
      }

      // Build update data
      const updateData: any = {};
      if (name) updateData.name = ValidationUtils.sanitizeString(name);
      if (description !== undefined) {
        updateData.description = description ? ValidationUtils.sanitizeString(description) : null;
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update the cohort
      const updatedCohort = await prisma.cohort.update({
        where: { id: cohortId },
        data: updateData,
        include: {
          _count: {
            select: {
              enrollments: true,
              specializations: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'COHORT_UPDATED',
          description: `Updated cohort: ${updatedCohort.name}`,
          metadata: {
            cohortId: cohortId,
            changes: updateData,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedCohort,
        message: 'Cohort updated successfully',
      });
    } catch (error) {
      console.error('Update cohort error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Delete cohort
   */
  static async deleteCohort(req: Request, res: Response): Promise<void> {
    try {
      const { cohortId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if cohort exists
      const existingCohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        include: {
          _count: {
            select: {
              enrollments: true,
              specializations: true,
            },
          },
        },
      });

      if (!existingCohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found',
        });
        return;
      }

      // Check if cohort has enrollments or specializations
      if (existingCohort._count.enrollments > 0 || existingCohort._count.specializations > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete cohort with existing enrollments or specializations',
        });
        return;
      }

      // Delete the cohort
      await prisma.cohort.delete({
        where: { id: cohortId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'COHORT_DELETED',
          description: `Deleted cohort: ${existingCohort.name}`,
          metadata: {
            cohortId: cohortId,
            cohortName: existingCohort.name,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Cohort deleted successfully',
      });
    } catch (error) {
      console.error('Delete cohort error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
