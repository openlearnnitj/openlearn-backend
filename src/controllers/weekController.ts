import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';

export class WeekController {
  /**
   * Create a new week in a league
   */
  static async createWeek(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, order, leagueId } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ name, order, leagueId });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Validate order is a positive integer
      if (!Number.isInteger(order) || order < 1) {
        res.status(400).json({
          success: false,
          error: 'Order must be a positive integer',
        });
        return;
      }

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // Check if week with same order already exists in this league
      const existingWeek = await prisma.week.findUnique({
        where: {
          leagueId_order: {
            leagueId,
            order,
          },
        },
      });

      if (existingWeek) {
        res.status(400).json({
          success: false,
          error: `Week with order ${order} already exists in this league`,
        });
        return;
      }

      // Create the week
      const week = await prisma.week.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          order,
          leagueId,
        },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
          sections: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              sections: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'WEEK_CREATED',
          description: `Created week "${week.name}" in league "${league.name}"`,
          metadata: {
            weekId: week.id,
            weekName: week.name,
            leagueId: league.id,
            leagueName: league.name,
            order: week.order,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: week,
        message: 'Week created successfully',
      });
    } catch (error) {
      console.error('Error creating week:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all weeks for a specific league
   */
  static async getWeeksByLeague(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { id: true, name: true },
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // Get weeks with pagination
      const [weeks, total] = await Promise.all([
        prisma.week.findMany({
          where: { leagueId },
          skip,
          take: limit,
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                order: true,
              },
            },
            _count: {
              select: {
                sections: true,
              },
            },
          },
        }),
        prisma.week.count({
          where: { leagueId },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          league: {
            id: league.id,
            name: league.name,
          },
          weeks,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        message: 'Weeks retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching weeks by league:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get a specific week by ID with all sections
   */
  static async getWeekById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const week = await prisma.week.findUnique({
        where: { id },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              resources: {
                orderBy: { order: 'asc' },
              },
              _count: {
                select: {
                  resources: true,
                },
              },
            },
          },
          _count: {
            select: {
              sections: true,
            },
          },
        },
      });

      if (!week) {
        res.status(404).json({
          success: false,
          error: 'Week not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: week,
        message: 'Week retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching week by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update a week
   */
  static async updateWeek(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, order } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if week exists
      const existingWeek = await prisma.week.findUnique({
        where: { id },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!existingWeek) {
        res.status(404).json({
          success: false,
          error: 'Week not found',
        });
        return;
      }

      // Validate order if provided
      if (order !== undefined) {
        if (!Number.isInteger(order) || order < 1) {
          res.status(400).json({
            success: false,
            error: 'Order must be a positive integer',
          });
          return;
        }

        // Check if new order conflicts with existing weeks (excluding current week)
        if (order !== existingWeek.order) {
          const conflictingWeek = await prisma.week.findUnique({
            where: {
              leagueId_order: {
                leagueId: existingWeek.leagueId,
                order,
              },
            },
          });

          if (conflictingWeek) {
            res.status(400).json({
              success: false,
              error: `Week with order ${order} already exists in this league`,
            });
            return;
          }
        }
      }

      // Update the week
      const updatedWeek = await prisma.week.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(order && { order }),
        },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
          sections: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              order: true,
            },
          },
          _count: {
            select: {
              sections: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'WEEK_UPDATED',
          description: `Updated week "${updatedWeek.name}" in league "${existingWeek.league.name}"`,
          metadata: {
            weekId: updatedWeek.id,
            weekName: updatedWeek.name,
            leagueId: existingWeek.leagueId,
            leagueName: existingWeek.league.name,
            changes: {
              ...(name && name !== existingWeek.name && { name: { from: existingWeek.name, to: name } }),
              ...(description !== undefined && description !== existingWeek.description && {
                description: { from: existingWeek.description, to: description },
              }),
              ...(order && order !== existingWeek.order && { order: { from: existingWeek.order, to: order } }),
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedWeek,
        message: 'Week updated successfully',
      });
    } catch (error) {
      console.error('Error updating week:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Delete a week
   */
  static async deleteWeek(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if week exists and get related data
      const week = await prisma.week.findUnique({
        where: { id },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
          sections: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              sections: true,
            },
          },
        },
      });

      if (!week) {
        res.status(404).json({
          success: false,
          error: 'Week not found',
        });
        return;
      }

      // Check if week has sections
      if (week._count.sections > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete week with existing sections. Please delete all sections first.',
        });
        return;
      }

      // Delete the week
      await prisma.week.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'WEEK_DELETED',
          description: `Deleted week "${week.name}" from league "${week.league.name}"`,
          metadata: {
            weekId: week.id,
            weekName: week.name,
            weekOrder: week.order,
            leagueId: week.leagueId,
            leagueName: week.league.name,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          deletedWeek: {
            id: week.id,
            name: week.name,
            order: week.order,
          },
        },
        message: 'Week deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting week:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all weeks across all leagues (admin view)
   */
  static async getAllWeeks(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;
      const leagueId = req.query.leagueId as string;

      // Build where clause
      const where: any = {};
      if (leagueId) {
        where.leagueId = leagueId;
      }

      // Get weeks with pagination
      const [weeks, total] = await Promise.all([
        prisma.week.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { league: { name: 'asc' } },
            { order: 'asc' },
          ],
          include: {
            league: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                sections: true,
              },
            },
          },
        }),
        prisma.week.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          weeks,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        message: 'Weeks retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching all weeks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
