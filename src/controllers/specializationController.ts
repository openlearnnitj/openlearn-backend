import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';

export class SpecializationController {
  /**
   * Create a new specialization
   */
  static async createSpecialization(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, cohortId, leagues } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ name, cohortId });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Validate leagues array
      if (!leagues || !Array.isArray(leagues) || leagues.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one league is required for specialization',
        });
        return;
      }

      // Validate league objects format
      for (const league of leagues) {
        if (!league.leagueId || typeof league.order !== 'number') {
          res.status(400).json({
            success: false,
            error: 'Each league must have leagueId and order fields',
          });
          return;
        }
      }

      // Extract league IDs for validation
      const leagueIds = leagues.map((league: any) => league.leagueId);

      // Check if cohort exists
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
      });

      if (!cohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found',
        });
        return;
      }

      // Check if all leagues exist
      const foundLeagues = await prisma.league.findMany({
        where: {
          id: { in: leagueIds },
        },
      });

      if (foundLeagues.length !== leagueIds.length) {
        res.status(400).json({
          success: false,
          error: 'One or more leagues not found',
        });
        return;
      }

      // Check if specialization name already exists in the cohort
      const existingSpecialization = await prisma.specialization.findFirst({
        where: { 
          name: name.trim(),
          cohortId,
        },
      });

      if (existingSpecialization) {
        res.status(409).json({
          success: false,
          error: 'Specialization with this name already exists in the cohort',
        });
        return;
      }

      // Create specialization with leagues in a transaction
      const specialization = await prisma.$transaction(async (tx) => {
        // Create the specialization
        const newSpecialization = await tx.specialization.create({
          data: {
            name: ValidationUtils.sanitizeString(name),
            description: description ? ValidationUtils.sanitizeString(description) : null,
            cohortId,
          },
        });

        // Link leagues to the specialization
        const specializationLeagues = leagueIds.map((leagueId: string, index: number) => ({
          specializationId: newSpecialization.id,
          leagueId,
          order: index + 1,
        }));

        await tx.specializationLeague.createMany({
          data: specializationLeagues,
        });

        return newSpecialization;
      });

      // Fetch complete specialization data
      const completeSpecialization = await prisma.specialization.findUnique({
        where: { id: specialization.id },
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
            },
          },
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
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'SPECIALIZATION_CREATED',
          description: `Created specialization: ${specialization.name}`,
          metadata: {
            specializationId: specialization.id,
            specializationName: specialization.name,
            cohortId,
            leagueIds,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: completeSpecialization,
        message: 'Specialization created successfully',
      });
    } catch (error) {
      console.error('Create specialization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all specializations
   */
  static async getSpecializations(req: Request, res: Response): Promise<void> {
    try {
      const { cohortId, page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Build filter conditions
      const where: any = {};
      if (cohortId) where.cohortId = cohortId as string;

      const [specializations, total] = await Promise.all([
        prisma.specialization.findMany({
          where,
          skip,
          take,
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
              },
            },
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
              orderBy: {
                order: 'asc',
              },
            },
            _count: {
              select: {
                userSpecializations: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.specialization.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          specializations,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        message: 'Specializations retrieved successfully',
      });
    } catch (error) {
      console.error('Get specializations error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get specialization by ID
   */
  static async getSpecializationById(req: Request, res: Response): Promise<void> {
    try {
      const { id: specializationId } = req.params;

      const specialization = await prisma.specialization.findUnique({
        where: { id: specializationId },
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          leagues: {
            include: {
              league: {
                include: {
                  weeks: {
                    orderBy: {
                      order: 'asc',
                    },
                    select: {
                      id: true,
                      name: true,
                      order: true,
                      _count: {
                        select: {
                          sections: true,
                        },
                      },
                    },
                  },
                  badges: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
          userSpecializations: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              completedAt: 'desc',
            },
          },
          _count: {
            select: {
              userSpecializations: true,
            },
          },
        },
      });

      if (!specialization) {
        res.status(404).json({
          success: false,
          error: 'Specialization not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: specialization,
        message: 'Specialization retrieved successfully',
      });
    } catch (error) {
      console.error('Get specialization by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update specialization
   */
  static async updateSpecialization(req: Request, res: Response): Promise<void> {
    try {
      const { id: specializationId } = req.params;
      const { name, description, leagueIds } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if specialization exists
      const existingSpecialization = await prisma.specialization.findUnique({
        where: { id: specializationId },
        include: {
          leagues: true,
        },
      });

      if (!existingSpecialization) {
        res.status(404).json({
          success: false,
          error: 'Specialization not found',
        });
        return;
      }

      // If name is being updated, check for duplicates
      if (name && name !== existingSpecialization.name) {
        const duplicateSpecialization = await prisma.specialization.findFirst({
          where: { 
            name: name.trim(),
            cohortId: existingSpecialization.cohortId,
            id: { not: specializationId },
          },
        });

        if (duplicateSpecialization) {
          res.status(409).json({
            success: false,
            error: 'Specialization with this name already exists in the cohort',
          });
          return;
        }
      }

      // Update specialization in a transaction
      const updatedSpecialization = await prisma.$transaction(async (tx) => {
        // Update basic fields
        const updateData: any = {};
        if (name) updateData.name = ValidationUtils.sanitizeString(name);
        if (description !== undefined) {
          updateData.description = description ? ValidationUtils.sanitizeString(description) : null;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.specialization.update({
            where: { id: specializationId },
            data: updateData,
          });
        }

        // Update league associations if provided
        if (leagueIds && Array.isArray(leagueIds)) {
          // Validate leagues exist
          const leagues = await tx.league.findMany({
            where: { id: { in: leagueIds } },
          });

          if (leagues.length !== leagueIds.length) {
            throw new Error('One or more leagues not found');
          }

          // Remove existing league associations
          await tx.specializationLeague.deleteMany({
            where: { specializationId },
          });

          // Add new league associations
          const specializationLeagues = leagueIds.map((leagueId: string, index: number) => ({
            specializationId,
            leagueId,
            order: index + 1,
          }));

          await tx.specializationLeague.createMany({
            data: specializationLeagues,
          });
        }

        // Return the complete specialization with leagues
        return await tx.specialization.findUnique({
          where: { id: specializationId },
          include: {
            leagues: {
              include: {
                league: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        });
      });

      if (!updatedSpecialization) {
        res.status(404).json({
          success: false,
          error: 'Specialization not found after update',
        });
        return;
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'SPECIALIZATION_UPDATED',
          description: `Updated specialization: ${updatedSpecialization.name}`,
          metadata: {
            specializationId,
            changes: { name, description, leagueIds },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedSpecialization,
        message: 'Specialization updated successfully',
      });
    } catch (error) {
      console.error('Update specialization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Delete specialization
   */
  static async deleteSpecialization(req: Request, res: Response): Promise<void> {
    try {
      const { id: specializationId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if specialization exists
      const existingSpecialization = await prisma.specialization.findUnique({
        where: { id: specializationId },
        include: {
          _count: {
            select: {
              userSpecializations: true,
            },
          },
        },
      });

      if (!existingSpecialization) {
        res.status(404).json({
          success: false,
          error: 'Specialization not found',
        });
        return;
      }

      // Check if specialization has completions
      if (existingSpecialization._count.userSpecializations > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete specialization with existing completions',
        });
        return;
      }

      // Delete specialization (cascade will handle league associations)
      await prisma.specialization.delete({
        where: { id: specializationId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'SPECIALIZATION_DELETED',
          description: `Deleted specialization: ${existingSpecialization.name}`,
          metadata: {
            specializationId,
            specializationName: existingSpecialization.name,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Specialization deleted successfully',
      });
    } catch (error) {
      console.error('Delete specialization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
