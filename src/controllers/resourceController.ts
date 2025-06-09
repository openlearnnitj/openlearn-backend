/**
 * Resource Controller
 * 
 * Manages CRUD operations for section resources.
 * Resources are the actual learning materials within sections (videos, articles, blogs, external links).
 * 
 * Hierarchy: Cohort → Specialization → League → Week → Section → Resource
 * 
 * @author OpenLearn Development Team
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';
import { AuditAction, ResourceType } from '@prisma/client';

export class ResourceController {
  /**
   * Create a new resource within a section
   */
  static async createResource(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const { title, url, type, order } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ title, url, type, order, sectionId });
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

      // Validate title length
      if (title.length > 200) {
        res.status(400).json({
          success: false,
          error: 'Resource title must be 200 characters or less',
        });
        return;
      }

      // Validate resource type
      const validTypes = Object.values(ResourceType);
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid resource type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }

      // Validate URL format (basic validation)
      try {
        new URL(url);
      } catch {
        res.status(400).json({
          success: false,
          error: 'Invalid URL format',
        });
        return;
      }

      // Check if section exists
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

      // Check if resource with same order already exists in this section
      const existingResource = await prisma.sectionResource.findUnique({
        where: {
          sectionId_order: {
            sectionId,
            order,
          },
        },
      });

      if (existingResource) {
        res.status(409).json({
          success: false,
          error: `A resource with order ${order} already exists in this section`,
        });
        return;
      }

      // Create the resource
      const resource = await prisma.sectionResource.create({
        data: {
          title,
          url,
          type,
          order,
          sectionId,
        },
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

      // Log the creation
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_CREATED,
          description: `Created resource "${title}" (${type}) in section "${section.name}"`,
          metadata: {
            resourceId: resource.id,
            sectionId: section.id,
            weekId: section.weekId,
            leagueId: section.week.league.id,
            resourceType: type,
            order,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: resource,
        message: 'Resource created successfully',
      });
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create resource',
      });
    }
  }

  /**
   * Get all resources for a specific section
   */
  static async getResourcesBySection(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;

      // Verify the section exists
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

      // Get resources for this section
      const resources = await prisma.sectionResource.findMany({
        where: { sectionId },
        orderBy: {
          order: 'asc',
        },
      });

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
          resources,
        },
      });
    } catch (error) {
      console.error('Error fetching resources by section:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resources for section',
      });
    }
  }

  /**
   * Get all resources (admin view with filtering)
   */
  static async getAllResources(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId, weekId, leagueId, type, page = '1', limit = '20' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause based on filters
      let whereClause: any = {};
      
      if (sectionId) {
        whereClause.sectionId = sectionId as string;
      } else if (weekId) {
        whereClause.section = {
          weekId: weekId as string,
        };
      } else if (leagueId) {
        whereClause.section = {
          week: {
            leagueId: leagueId as string,
          },
        };
      }

      if (type) {
        whereClause.type = type as ResourceType;
      }

      // Get resources with pagination
      const [resources, totalCount] = await prisma.$transaction([
        prisma.sectionResource.findMany({
          where: whereClause,
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
          orderBy: [
            {
              section: {
                week: {
                  order: 'asc',
                },
              },
            },
            {
              section: {
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
        prisma.sectionResource.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        success: true,
        data: {
          resources,
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
      console.error('Error fetching resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resources',
      });
    }
  }

  /**
   * Get a specific resource by ID
   */
  static async getResourceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const resource = await prisma.sectionResource.findUnique({
        where: { id },
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

      res.status(200).json({
        success: true,
        data: resource,
      });
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource',
      });
    }
  }

  /**
   * Update a resource
   */
  static async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, url, type, order } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if resource exists
      const existingResource = await prisma.sectionResource.findUnique({
        where: { id },
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

      if (!existingResource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      }

      // Validate title if provided
      if (title && title.length > 200) {
        res.status(400).json({
          success: false,
          error: 'Resource title must be 200 characters or less',
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

      // Validate resource type if provided
      if (type) {
        const validTypes = Object.values(ResourceType);
        if (!validTypes.includes(type)) {
          res.status(400).json({
            success: false,
            error: `Invalid resource type. Must be one of: ${validTypes.join(', ')}`,
          });
          return;
        }
      }

      // Validate URL if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          res.status(400).json({
            success: false,
            error: 'Invalid URL format',
          });
          return;
        }
      }

      // If order is being updated, check for conflicts
      if (order && order !== existingResource.order) {
        const conflictingResource = await prisma.sectionResource.findUnique({
          where: {
            sectionId_order: {
              sectionId: existingResource.sectionId,
              order,
            },
          },
        });

        if (conflictingResource) {
          res.status(409).json({
            success: false,
            error: `A resource with order ${order} already exists in this section`,
          });
          return;
        }
      }

      // Build update data
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (url !== undefined) updateData.url = url;
      if (type !== undefined) updateData.type = type;
      if (order !== undefined) updateData.order = order;

      // Update the resource
      const updatedResource = await prisma.sectionResource.update({
        where: { id },
        data: updateData,
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

      // Log the update
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_UPDATED,
          description: `Updated resource "${updatedResource.title}"`,
          metadata: {
            resourceId: id,
            sectionId: existingResource.sectionId,
            weekId: existingResource.section.weekId,
            leagueId: existingResource.section.week.league.id,
            changes: updateData,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedResource,
        message: 'Resource updated successfully',
      });
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update resource',
      });
    }
  }

  /**
   * Delete a resource
   */
  static async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if resource exists and get details for logging
      const resource = await prisma.sectionResource.findUnique({
        where: { id },
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

      // Delete the resource
      await prisma.sectionResource.delete({
        where: { id },
      });

      // Log the deletion
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_DELETED,
          description: `Deleted resource "${resource.title}" (${resource.type}) from section "${resource.section.name}"`,
          metadata: {
            resourceId: id,
            resourceTitle: resource.title,
            resourceType: resource.type,
            sectionId: resource.sectionId,
            sectionName: resource.section.name,
            weekId: resource.section.weekId,
            weekName: resource.section.week.name,
            leagueId: resource.section.week.league.id,
            leagueName: resource.section.week.league.name,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: `Resource "${resource.title}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete resource',
      });
    }
  }

  /**
   * Reorder resources within a section
   */
  static async reorderResources(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const { resourceOrders } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate input
      if (!Array.isArray(resourceOrders)) {
        res.status(400).json({
          success: false,
          error: 'resourceOrders must be an array',
        });
        return;
      }

      // Validate each resource order entry
      for (const item of resourceOrders) {
        if (!item.resourceId || !Number.isInteger(item.order) || item.order < 1) {
          res.status(400).json({
            success: false,
            error: 'Each item must have resourceId and positive integer order',
          });
          return;
        }
      }

      // Verify section exists
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

      // Verify all resources belong to this section
      const resourceIds = resourceOrders.map((item: any) => item.resourceId);
      const resourcesInSection = await prisma.sectionResource.findMany({
        where: {
          id: { in: resourceIds },
          sectionId,
        },
      });

      if (resourcesInSection.length !== resourceIds.length) {
        res.status(400).json({
          success: false,
          error: 'Some resources do not belong to this section',
        });
        return;
      }

      // Check for duplicate orders
      const orders = resourceOrders.map((item: any) => item.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        res.status(400).json({
          success: false,
          error: 'Duplicate order values are not allowed',
        });
        return;
      }

      // Update all resources in a transaction
      const updatePromises = resourceOrders.map(({ resourceId, order }: any) =>
        prisma.sectionResource.update({
          where: { id: resourceId },
          data: { order },
        })
      );

      await prisma.$transaction(updatePromises);

      // Get updated resources
      const updatedResources = await prisma.sectionResource.findMany({
        where: { sectionId },
        orderBy: {
          order: 'asc',
        },
      });

      // Log the reordering
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.RESOURCE_REORDERED,
          description: `Reordered resources in section "${section.name}"`,
          metadata: {
            sectionId,
            sectionName: section.name,
            weekId: section.weekId,
            weekName: section.week.name,
            leagueId: section.week.league.id,
            leagueName: section.week.league.name,
            newOrders: resourceOrders,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedResources,
        message: 'Resources reordered successfully',
      });
    } catch (error) {
      console.error('Error reordering resources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reorder resources',
      });
    }
  }
}
