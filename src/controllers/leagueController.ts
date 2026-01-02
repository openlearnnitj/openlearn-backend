import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';

export class LeagueController {
  /**
   * Create a new league
   */
  static async createLeague(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
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

      // Check if league name already exists
      const existingLeague = await prisma.league.findFirst({
        where: { name: name.trim() },
      });

      if (existingLeague) {
        res.status(409).json({
          success: false,
          error: 'League with this name already exists',
        });
        return;
      }

      // Create the league
      const league = await prisma.league.create({
        data: {
          name: ValidationUtils.sanitizeString(name),
          description: description ? ValidationUtils.sanitizeString(description) : null,
        },
        include: {
          _count: {
            select: {
              weeks: true,
              enrollments: true,
              badges: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'LEAGUE_CREATED',
          description: `Created league: ${league.name}`,
          metadata: {
            leagueId: league.id,
            leagueName: league.name,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: league,
        message: 'League created successfully',
      });
    } catch (error) {
      console.error('Create league error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all leagues
   */
  static async getLeagues(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [leagues, total] = await Promise.all([
        prisma.league.findMany({
          skip,
          take,
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
            assignment: {
              select: {
                id: true,
                title: true,
                description: true,
                dueDate: true,
              },
            },
            _count: {
              select: {
                weeks: true,
                enrollments: true,
                badges: true,
                specializations: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.league.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          leagues,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        message: 'Leagues retrieved successfully',
      });
    } catch (error) {
      console.error('Get leagues error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get league by ID
   */
  static async getLeagueById(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;

      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          weeks: {
            orderBy: {
              order: 'asc',
            },
            include: {
              sections: {
                orderBy: {
                  order: 'asc',
                },
                include: {
                  resources: {
                    orderBy: {
                      order: 'asc',
                    },
                  },
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
          assignment: {
            select: {
              id: true,
              title: true,
              description: true,
              dueDate: true,
              _count: {
                select: {
                  submissions: true,
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
              cohort: {
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
              weeks: true,
              enrollments: true,
              badges: true,
              specializations: true,
            },
          },
        },
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: league,
        message: 'League retrieved successfully',
      });
    } catch (error) {
      console.error('Get league by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update league
   */
  static async updateLeague(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;
      const { name, description } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if league exists
      const existingLeague = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!existingLeague) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // If name is being updated, check for duplicates
      if (name && name !== existingLeague.name) {
        const duplicateLeague = await prisma.league.findFirst({
          where: { 
            name: name.trim(),
            id: { not: leagueId },
          },
        });

        if (duplicateLeague) {
          res.status(409).json({
            success: false,
            error: 'League with this name already exists',
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

      // Update the league
      const updatedLeague = await prisma.league.update({
        where: { id: leagueId },
        data: updateData,
        include: {
          _count: {
            select: {
              weeks: true,
              enrollments: true,
              badges: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'LEAGUE_UPDATED',
          description: `Updated league: ${updatedLeague.name}`,
          metadata: {
            leagueId: leagueId,
            changes: updateData,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedLeague,
        message: 'League updated successfully',
      });
    } catch (error) {
      console.error('Update league error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Delete league with cascade deletion of all related data
   * This is an irreversible operation that deletes:
   * - All weeks (modules) in the league
   * - All student enrollments
   * - All badges
   * - All specialization associations
   * - All assignments
   * - All pathfinder scopes
   */
  static async deleteLeague(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if league exists and get related data count
      const existingLeague = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          _count: {
            select: {
              weeks: true,
              enrollments: true,
              badges: true,
              specializations: true,
            },
          },
        },
      });

      if (!existingLeague) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // Collect deletion statistics for audit log
      // Count pathfinder scopes separately since it may not be in _count
      const pathfinderScopesCount = await prisma.pathfinderScope.count({
        where: { leagueId },
      });

      const deletionStats = {
        weeks: existingLeague._count.weeks,
        enrollments: existingLeague._count.enrollments,
        badges: existingLeague._count.badges,
        specializations: existingLeague._count.specializations,
        pathfinderScopes: pathfinderScopesCount,
      };

      // Perform cascade deletion within a transaction
      await prisma.$transaction(async (tx) => {
        // Delete pathfinder scopes
        await tx.pathfinderScope.deleteMany({
          where: { leagueId },
        });

        // Delete assignments associated with this league
        await tx.assignment.deleteMany({
          where: { leagueId },
        });

        // Delete specialization-league associations
        await tx.specializationLeague.deleteMany({
          where: { leagueId },
        });

        // Delete badges (this will cascade to user_badges due to schema onDelete: Cascade)
        await tx.badge.deleteMany({
          where: { leagueId },
        });

        // Delete enrollments
        await tx.enrollment.deleteMany({
          where: { leagueId },
        });

        // Delete weeks (this will cascade to sections and section_resources due to schema onDelete: Cascade)
        await tx.week.deleteMany({
          where: { leagueId },
        });

        // Finally, delete the league itself
        await tx.league.delete({
          where: { id: leagueId },
        });
      }, {
        timeout: 30000, // 30 second timeout for large deletions
      });

      // Create comprehensive audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'LEAGUE_CASCADE_DELETED',
          description: `CASCADE DELETED league: ${existingLeague.name} with all related data`,
          metadata: {
            leagueId: leagueId,
            leagueName: existingLeague.name,
            deletionStats,
            warning: 'IRREVERSIBLE_CASCADE_DELETE',
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'League and all related data deleted successfully',
        deletionStats,
      });
    } catch (error) {
      console.error('Delete league error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get league statistics
   */
  static async getLeagueStats(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // Get statistics
      const [
        totalEnrollments,
        activeEnrollments,
        totalWeeks,
        totalSections,
        badgesAwarded,
        assignmentSubmissions,
      ] = await Promise.all([
        prisma.enrollment.count({
          where: { leagueId },
        }),
        prisma.enrollment.count({
          where: { 
            leagueId,
            user: {
              status: 'ACTIVE',
            },
          },
        }),
        prisma.week.count({
          where: { leagueId },
        }),
        prisma.section.count({
          where: { 
            week: {
              leagueId,
            },
          },
        }),
        prisma.userBadge.count({
          where: {
            badge: {
              leagueId,
            },
          },
        }),
        prisma.assignmentSubmission.count({
          where: {
            assignment: {
              leagueId,
            },
          },
        }),
      ]);

      const stats = {
        league,
        statistics: {
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
          },
          content: {
            weeks: totalWeeks,
            sections: totalSections,
          },
          achievements: {
            badgesAwarded,
            assignmentSubmissions,
          },
        },
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: 'League statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Get league stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
