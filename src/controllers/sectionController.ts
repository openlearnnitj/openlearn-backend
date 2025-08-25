/**
 * Section Controller
 * 
 * Manages CRUD operations for sections within weeks.
 * Sections contain the actual learning resources (blogs, videos, links).
 * 
 * Hierarchy: Cohort → Specialization → League → Week → Section → Resources
 * 
 * @author OpenLearn Development Team
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';
import { UserRole, AuditAction } from '@prisma/client';

export class SectionController {
  /**
   * Create a new section within a week
   */
  static async createSection(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, order, weekId } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ name, order, weekId });
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

      // Validate name length
      if (name.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Section name must be 100 characters or less',
        });
        return;
      }

      // Check if week exists and get league info
      const week = await prisma.week.findUnique({
        where: { id: weekId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
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

      // Security: Check if user has access to this league (unless GRAND_PATHFINDER)
      if (currentUser.role !== UserRole.GRAND_PATHFINDER) {
        const scope = await prisma.pathfinderScope.findFirst({
          where: {
            pathfinderId: currentUser.userId,
            leagueId: week.league.id
          }
        });

        if (!scope) {
          res.status(403).json({
            success: false,
            error: 'No access to this league',
            leagueId: week.league.id,
            leagueName: week.league.name
          });
          return;
        }
      }

      // Check if section with same order already exists in this week
      const existingSection = await prisma.section.findUnique({
        where: {
          weekId_order: {
            weekId,
            order,
          },
        },
      });

      if (existingSection) {
        res.status(409).json({
          success: false,
          error: `A section with order ${order} already exists in this week`,
        });
        return;
      }

      // Create the section
      const section = await prisma.section.create({
        data: {
          name,
          description: description || null,
          order,
          weekId,
        },
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          resources: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      // Log the creation
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.SECTION_CREATED,
          description: `Created section "${name}" (order: ${order}) in week "${week.name}"`,
          metadata: {
            sectionId: section.id,
            weekId: week.id,
            leagueId: week.league.id,
            order,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: section,
        message: 'Section created successfully',
      });
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create section',
      });
    }
  }

  /**
   * Get all sections (admin view with filtering)
   */
  static async getAllSections(req: Request, res: Response): Promise<void> {
    try {
      const { weekId, leagueId, page = '1', limit = '20' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause based on filters
      let whereClause: any = {};
      
      if (weekId) {
        whereClause.weekId = weekId as string;
      } else if (leagueId) {
        whereClause.week = {
          leagueId: leagueId as string,
        };
      }

      // Get sections with pagination
      const [sections, totalCount] = await prisma.$transaction([
        prisma.section.findMany({
          where: whereClause,
          include: {
            week: {
              include: {
                league: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            resources: {
              orderBy: {
                order: 'asc',
              },
            },
            _count: {
              select: {
                resources: true,
                progress: true,
              },
            },
          },
          orderBy: [
            {
              week: {
                order: 'asc',
              },
            },
            {
              order: 'asc',
            },
          ],
          skip,
          take: limitNum,
        }),
        prisma.section.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        success: true,
        data: {
          sections,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sections',
      });
    }
  }

  /**
   * Get all sections for a specific week
   */
  static async getSectionsByWeek(req: Request, res: Response): Promise<void> {
    try {
      const { id: weekId } = req.params; // Get weekId from :id parameter

      // Verify the week exists
      const week = await prisma.week.findUnique({
        where: { id: weekId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
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

      // Get sections for this week
      const sections = await prisma.section.findMany({
        where: { weekId },
        include: {
          resources: {
            orderBy: {
              order: 'asc',
            },
          },
          _count: {
            select: {
              resources: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      res.status(200).json({
        success: true,
        data: {
          week: {
            id: week.id,
            name: week.name,
            description: week.description,
            order: week.order,
            league: week.league,
          },
          sections,
        },
      });
    } catch (error) {
      console.error('Error fetching sections by week:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sections for week',
      });
    }
  }

  /**
   * Get a specific section by ID
   */
  static async getSectionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user as TokenPayload;

      const section = await prisma.section.findUnique({
        where: { id },
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          resources: {
            orderBy: {
              order: 'asc',
            },
          },
          progress: {
            where: {
              userId: currentUser.userId,
            },
            select: {
              isCompleted: true,
              completedAt: true,
              personalNote: true,
              markedForRevision: true,
            },
          },
        },
      });

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found',
        });
        return;
      }

      // Include user's progress if they have any
      const sectionWithProgress = {
        ...section,
        userProgress: section.progress[0] || null,
        progress: undefined, // Remove the array, replace with single object
      };

      res.status(200).json({
        success: true,
        data: sectionWithProgress,
      });
    } catch (error) {
      console.error('Error fetching section:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch section',
      });
    }
  }

  /**
   * Update a section
   */
  static async updateSection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, order } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if section exists
      const existingSection = await prisma.section.findUnique({
        where: { id },
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!existingSection) {
        res.status(404).json({
          success: false,
          error: 'Section not found',
        });
        return;
      }

      // Security: Check if user has access to this league (unless GRAND_PATHFINDER)
      if (currentUser.role !== UserRole.GRAND_PATHFINDER) {
        const scope = await prisma.pathfinderScope.findFirst({
          where: {
            pathfinderId: currentUser.userId,
            leagueId: existingSection.week.league.id
          }
        });

        if (!scope) {
          res.status(403).json({
            success: false,
            error: 'No access to this league',
            leagueId: existingSection.week.league.id,
            leagueName: existingSection.week.league.name
          });
          return;
        }
      }

      // Validate name if provided
      if (name && name.length > 100) {
        res.status(400).json({
          success: false,
          error: 'Section name must be 100 characters or less',
        });
        return;
      }

      // Validate order if provided
      if (order !== undefined && (!Number.isInteger(order) || order < 1)) {
        res.status(400).json({
          success: false,
          error: 'Order must be a positive integer',
        });
        return;
      }

      // If order is being updated, check for conflicts
      if (order && order !== existingSection.order) {
        const conflictingSection = await prisma.section.findUnique({
          where: {
            weekId_order: {
              weekId: existingSection.weekId,
              order,
            },
          },
        });

        if (conflictingSection) {
          res.status(409).json({
            success: false,
            error: `A section with order ${order} already exists in this week`,
          });
          return;
        }
      }

      // Build update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (order !== undefined) updateData.order = order;

      // Update the section
      const updatedSection = await prisma.section.update({
        where: { id },
        data: updateData,
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          resources: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      // Log the update
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.SECTION_UPDATED,
          description: `Updated section "${updatedSection.name}"`,
          metadata: {
            sectionId: id,
            weekId: existingSection.weekId,
            leagueId: existingSection.week.league.id,
            changes: updateData,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedSection,
        message: 'Section updated successfully',
      });
    } catch (error) {
      console.error('Error updating section:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update section',
      });
    }
  }

  /**
   * Delete a section
   */
  static async deleteSection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if section exists and get details for logging
      const section = await prisma.section.findUnique({
        where: { id },
        include: {
          week: {
            include: {
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
              resources: true,
              progress: true,
            },
          },
        },
      });

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found',
        });
        return;
      }

      // Security: Check if user has access to this league (unless GRAND_PATHFINDER)
      if (currentUser.role !== UserRole.GRAND_PATHFINDER) {
        const scope = await prisma.pathfinderScope.findFirst({
          where: {
            pathfinderId: currentUser.userId,
            leagueId: section.week.league.id
          }
        });

        if (!scope) {
          res.status(403).json({
            success: false,
            error: 'No access to this league',
            leagueId: section.week.league.id,
            leagueName: section.week.league.name
          });
          return;
        }
      }

      // Warn if section has progress records
      if (section._count.progress > 0) {
        console.warn(`Deleting section ${id} with ${section._count.progress} progress records`);
      }

      // Delete the section (cascade will handle resources and progress)
      await prisma.section.delete({
        where: { id },
      });

      // Log the deletion
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.SECTION_DELETED,
          description: `Deleted section "${section.name}" from week "${section.week.name}"`,
          metadata: {
            sectionId: id,
            sectionName: section.name,
            weekId: section.weekId,
            weekName: section.week.name,
            leagueId: section.week.league.id,
            leagueName: section.week.league.name,
            deletedResourcesCount: section._count.resources,
            deletedProgressCount: section._count.progress,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: `Section "${section.name}" deleted successfully`,
        deletedResourcesCount: section._count.resources,
        deletedProgressCount: section._count.progress,
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete section',
      });
    }
  }

  /**
   * Reorder sections within a week
   */
  static async reorderSections(req: Request, res: Response): Promise<void> {
    try {
      const { id: weekId } = req.params; // Get weekId from :id parameter
      const { sectionOrders } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate input
      if (!Array.isArray(sectionOrders)) {
        res.status(400).json({
          success: false,
          error: 'sectionOrders must be an array',
        });
        return;
      }

      // Validate each section order entry
      for (const item of sectionOrders) {
        if (!item.sectionId || !Number.isInteger(item.order) || item.order < 1) {
          res.status(400).json({
            success: false,
            error: 'Each item must have sectionId and positive integer order',
          });
          return;
        }
      }

      // Verify week exists
      const week = await prisma.week.findUnique({
        where: { id: weekId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
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

      // Verify all sections belong to this week
      const sectionIds = sectionOrders.map((item: any) => item.sectionId);
      const sectionsInWeek = await prisma.section.findMany({
        where: {
          id: { in: sectionIds },
          weekId,
        },
      });

      if (sectionsInWeek.length !== sectionIds.length) {
        res.status(400).json({
          success: false,
          error: 'Some sections do not belong to this week',
        });
        return;
      }

      // Check for duplicate orders
      const orders = sectionOrders.map((item: any) => item.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        res.status(400).json({
          success: false,
          error: 'Duplicate order values are not allowed',
        });
        return;
      }

      // Update all sections in a transaction
      const updatePromises = sectionOrders.map(({ sectionId, order }: any) =>
        prisma.section.update({
          where: { id: sectionId },
          data: { order },
        })
      );

      await prisma.$transaction(updatePromises);

      // Get updated sections
      const updatedSections = await prisma.section.findMany({
        where: { weekId },
        include: {
          resources: {
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Log the reordering
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.SECTION_REORDERED,
          description: `Reordered sections in week "${week.name}"`,
          metadata: {
            weekId,
            weekName: week.name,
            leagueId: week.league.id,
            leagueName: week.league.name,
            newOrders: sectionOrders,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedSections,
        message: 'Sections reordered successfully',
      });
    } catch (error) {
      console.error('Error reordering sections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reorder sections',
      });
    }
  }
}
