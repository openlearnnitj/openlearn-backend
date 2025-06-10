/**
 * Resource Progress Controller
 * 
 * Handles user interactions with individual learning resources:
 * - Mark resources as completed
 * - Add personal notes
 * - Mark resources for revision
 * - Track time spent on resources
 * 
 * This enables granular progress tracking at the resource level,
 * allowing users to interact with individual videos, articles, blogs, etc.
 * 
 * @author OpenLearn Development Team
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';
import { AuditAction } from '@prisma/client';

export class ResourceProgressController {
  /**
   * Get user's progress for a specific resource
   */
  static async getResourceProgress(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Validate resource exists
      const resource = await prisma.sectionResource.findUnique({
        where: { id: resourceId },
        include: {
          section: {
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
          },
        },
      });

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Get or create progress record
      let progress = await prisma.resourceProgress.findUnique({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
      });

      // If no progress exists, create a new one
      if (!progress) {
        progress = await prisma.resourceProgress.create({
          data: {
            userId: currentUser.userId,
            resourceId,
            isCompleted: false,
            markedForRevision: false,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          resource: {
            id: resource.id,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            order: resource.order,
            section: {
              id: resource.section.id,
              name: resource.section.name,
              week: {
                id: resource.section.week.id,
                name: resource.section.week.name,
                league: resource.section.week.league,
              },
            },
          },
          progress: {
            id: progress.id,
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
            personalNote: progress.personalNote,
            markedForRevision: progress.markedForRevision,
            timeSpent: progress.timeSpent,
            createdAt: progress.createdAt,
            updatedAt: progress.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching resource progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource progress',
      });
    }
  }

  /**
   * Mark a resource as completed
   */
  static async markResourceCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;
      const { timeSpent, personalNote } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate resource exists
      const resource = await prisma.sectionResource.findUnique({
        where: { id: resourceId },
        include: {
          section: {
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
          },
        },
      });

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Validate timeSpent if provided
      if (timeSpent !== undefined && (!Number.isInteger(timeSpent) || timeSpent < 0)) {
        res.status(400).json({
          success: false,
          error: 'Time spent must be a non-negative integer (seconds)',
        });
        return;
      }

      // Sanitize personal note if provided
      const sanitizedNote = personalNote ? ValidationUtils.sanitizeString(personalNote) : undefined;

      // Validate note length
      if (sanitizedNote && sanitizedNote.length > 1000) {
        res.status(400).json({
          success: false,
          error: 'Personal note must be 1000 characters or less',
        });
        return;
      }

      // Update or create progress record
      const progress = await prisma.resourceProgress.upsert({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
          personalNote: sanitizedNote,
          timeSpent: timeSpent,
        },
        create: {
          userId: currentUser.userId,
          resourceId,
          isCompleted: true,
          completedAt: new Date(),
          personalNote: sanitizedNote,
          timeSpent: timeSpent,
          markedForRevision: false,
        },
        include: {
          resource: {
            include: {
              section: {
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
              },
            },
          },
        },
      });

      // Log the completion
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_COMPLETED,
          description: `Completed resource "${resource.title}" (${resource.type}) in section "${resource.section.name}"`,
          metadata: {
            resourceId: resource.id,
            resourceTitle: resource.title,
            resourceType: resource.type,
            sectionId: resource.sectionId,
            sectionName: resource.section.name,
            weekId: resource.section.weekId,
            weekName: resource.section.week.name,
            leagueId: resource.section.week.league.id,
            leagueName: resource.section.week.league.name,
            timeSpent: timeSpent || null,
            hasPersonalNote: !!sanitizedNote,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: progress,
        message: `Resource "${resource.title}" marked as completed!`,
      });
    } catch (error) {
      console.error('Error marking resource as completed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark resource as completed',
      });
    }
  }

  /**
   * Mark a resource for revision
   */
  static async markResourceForRevision(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;
      const { personalNote } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate resource exists
      const resource = await prisma.sectionResource.findUnique({
        where: { id: resourceId },
        include: {
          section: {
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
          },
        },
      });

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Sanitize personal note if provided
      const sanitizedNote = personalNote ? ValidationUtils.sanitizeString(personalNote) : undefined;

      // Validate note length
      if (sanitizedNote && sanitizedNote.length > 1000) {
        res.status(400).json({
          success: false,
          error: 'Personal note must be 1000 characters or less',
        });
        return;
      }

      // Update or create progress record
      const progress = await prisma.resourceProgress.upsert({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
        update: {
          markedForRevision: true,
          personalNote: sanitizedNote,
        },
        create: {
          userId: currentUser.userId,
          resourceId,
          isCompleted: false,
          markedForRevision: true,
          personalNote: sanitizedNote,
        },
        include: {
          resource: {
            include: {
              section: {
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
              },
            },
          },
        },
      });

      // Log the revision marking
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_MARKED_FOR_REVISION,
          description: `Marked resource "${resource.title}" for revision in section "${resource.section.name}"`,
          metadata: {
            resourceId: resource.id,
            resourceTitle: resource.title,
            resourceType: resource.type,
            sectionId: resource.sectionId,
            sectionName: resource.section.name,
            weekId: resource.section.weekId,
            weekName: resource.section.week.name,
            leagueId: resource.section.week.league.id,
            leagueName: resource.section.week.league.name,
            hasPersonalNote: !!sanitizedNote,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: progress,
        message: `Resource "${resource.title}" marked for revision!`,
      });
    } catch (error) {
      console.error('Error marking resource for revision:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark resource for revision',
      });
    }
  }

  /**
   * Update personal note for a resource
   */
  static async updateResourceNote(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;
      const { personalNote } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ personalNote });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Validate resource exists
      const resource = await prisma.sectionResource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Sanitize and validate note
      const sanitizedNote = ValidationUtils.sanitizeString(personalNote);
      if (sanitizedNote.length > 1000) {
        res.status(400).json({
          success: false,
          error: 'Personal note must be 1000 characters or less',
        });
        return;
      }

      // Update or create progress record
      const progress = await prisma.resourceProgress.upsert({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
        update: {
          personalNote: sanitizedNote,
        },
        create: {
          userId: currentUser.userId,
          resourceId,
          isCompleted: false,
          markedForRevision: false,
          personalNote: sanitizedNote,
        },
      });

      res.status(200).json({
        success: true,
        data: progress,
        message: 'Personal note updated successfully!',
      });
    } catch (error) {
      console.error('Error updating resource note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update personal note',
      });
    }
  }

  /**
   * Reset resource progress (unmark as completed/revision)
   */
  static async resetResourceProgress(req: Request, res: Response): Promise<void> {
    try {
      const { resourceId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Validate resource exists
      const resource = await prisma.sectionResource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Check if progress exists
      const existingProgress = await prisma.resourceProgress.findUnique({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
      });

      if (!existingProgress) {
        res.status(404).json({
          success: false,
          error: 'No progress found for this resource',
        });
        return;
      }

      // Reset progress
      const progress = await prisma.resourceProgress.update({
        where: {
          userId_resourceId: {
            userId: currentUser.userId,
            resourceId,
          },
        },
        data: {
          isCompleted: false,
          completedAt: null,
          markedForRevision: false,
          timeSpent: null,
        },
      });

      res.status(200).json({
        success: true,
        data: progress,
        message: 'Resource progress reset successfully!',
      });
    } catch (error) {
      console.error('Error resetting resource progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset resource progress',
      });
    }
  }

  /**
   * Get all resources with progress for a specific section
   */
  static async getSectionResourcesWithProgress(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Validate section exists
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
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

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found',
        });
        return;
      }

      // Get all resources for this section with user's progress
      const resources = await prisma.sectionResource.findMany({
        where: { sectionId },
        include: {
          progress: {
            where: {
              userId: currentUser.userId,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Format response with progress information
      const resourcesWithProgress = resources.map(resource => ({
        id: resource.id,
        title: resource.title,
        url: resource.url,
        type: resource.type,
        order: resource.order,
        progress: resource.progress.length > 0 ? {
          isCompleted: resource.progress[0].isCompleted,
          completedAt: resource.progress[0].completedAt,
          personalNote: resource.progress[0].personalNote,
          markedForRevision: resource.progress[0].markedForRevision,
          timeSpent: resource.progress[0].timeSpent,
        } : {
          isCompleted: false,
          completedAt: null,
          personalNote: null,
          markedForRevision: false,
          timeSpent: null,
        },
      }));

      // Calculate section progress statistics
      const totalResources = resources.length;
      const completedResources = resourcesWithProgress.filter(r => r.progress.isCompleted).length;
      const markedForRevision = resourcesWithProgress.filter(r => r.progress.markedForRevision).length;
      const totalTimeSpent = resourcesWithProgress.reduce((sum, r) => sum + (r.progress.timeSpent || 0), 0);

      res.status(200).json({
        success: true,
        data: {
          section: {
            id: section.id,
            name: section.name,
            description: section.description,
            order: section.order,
            week: {
              id: section.week.id,
              name: section.week.name,
              league: section.week.league,
            },
          },
          resources: resourcesWithProgress,
          statistics: {
            totalResources,
            completedResources,
            markedForRevision,
            completionPercentage: totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0,
            totalTimeSpent, // in seconds
          },
        },
      });
    } catch (error) {
      console.error('Error fetching section resources with progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch section resources with progress',
      });
    }
  }

  /**
   * Get user's resources marked for revision
   */
  static async getResourcesMarkedForRevision(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;
      const { page = '1', limit = '20' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Get resources marked for revision
      const [revisionResources, totalCount] = await prisma.$transaction([
        prisma.resourceProgress.findMany({
          where: {
            userId: currentUser.userId,
            markedForRevision: true,
          },
          include: {
            resource: {
              include: {
                section: {
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
                },
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.resourceProgress.count({
          where: {
            userId: currentUser.userId,
            markedForRevision: true,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        success: true,
        data: {
          revisionResources: revisionResources.map(progress => ({
            progress: {
              id: progress.id,
              personalNote: progress.personalNote,
              markedForRevision: progress.markedForRevision,
              isCompleted: progress.isCompleted,
              completedAt: progress.completedAt,
              timeSpent: progress.timeSpent,
              updatedAt: progress.updatedAt,
            },
            resource: {
              id: progress.resource.id,
              title: progress.resource.title,
              url: progress.resource.url,
              type: progress.resource.type,
              order: progress.resource.order,
              section: {
                id: progress.resource.section.id,
                name: progress.resource.section.name,
                week: {
                  id: progress.resource.section.week.id,
                  name: progress.resource.section.week.name,
                  league: progress.resource.section.week.league,
                },
              },
            },
          })),
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
      console.error('Error fetching resources marked for revision:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resources marked for revision',
      });
    }
  }
}
