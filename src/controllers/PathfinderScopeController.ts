import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuditAction, UserRole } from '@prisma/client';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Simple audit logging function (inline)
 */
async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  description?: string;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        description: data.description,
        metadata: data.metadata
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export class PathfinderScopeController {
  /**
   * Get all pathfinder scopes with optional filtering
   * GET /api/pathfinder-scopes
   */
  async getAllScopes(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        pathfinderId, 
        cohortId, 
        specializationId, 
        leagueId,
        canManageUsers,
        canViewAnalytics,
        canCreateContent,
        page = '1',
        limit = '10'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter object
      const where: any = {};
      if (pathfinderId) where.pathfinderId = pathfinderId;
      if (cohortId) where.cohortId = cohortId;
      if (specializationId) where.specializationId = specializationId;
      if (leagueId) where.leagueId = leagueId;
      if (canManageUsers !== undefined) where.canManageUsers = canManageUsers === 'true';
      if (canViewAnalytics !== undefined) where.canViewAnalytics = canViewAnalytics === 'true';
      if (canCreateContent !== undefined) where.canCreateContent = canCreateContent === 'true';

      const [scopes, total] = await Promise.all([
        prisma.pathfinderScope.findMany({
          where,
          include: {
            pathfinder: {
              select: { id: true, name: true, email: true, role: true }
            },
            cohort: {
              select: { id: true, name: true, description: true }
            },
            specialization: {
              select: { id: true, name: true, description: true }
            },
            league: {
              select: { id: true, name: true, description: true }
            },
            assignedBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { assignedAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.pathfinderScope.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          scopes,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching pathfinder scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pathfinder scopes'
      });
    }
  }

  /**
   * Get current user's pathfinder scopes
   * GET /api/pathfinder-scopes/my-scopes
   */
  async getMyScopes(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const scopes = await prisma.pathfinderScope.findMany({
        where: { pathfinderId: userId },
        include: {
          cohort: {
            select: { id: true, name: true, description: true }
          },
          specialization: {
            select: { id: true, name: true, description: true }
          },
          league: {
            select: { id: true, name: true, description: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      res.json({
        success: true,
        data: { scopes }
      });

    } catch (error) {
      logger.error('Error fetching user scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch your scopes'
      });
    }
  }

  /**
   * Get specific scope by ID
   * GET /api/pathfinder-scopes/:id
   */
  async getScopeById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const scope = await prisma.pathfinderScope.findUnique({
        where: { id },
        include: {
          pathfinder: {
            select: { id: true, name: true, email: true, role: true }
          },
          cohort: {
            select: { id: true, name: true, description: true }
          },
          specialization: {
            select: { id: true, name: true, description: true }
          },
          league: {
            select: { id: true, name: true, description: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!scope) {
        return res.status(404).json({
          success: false,
          error: 'Pathfinder scope not found'
        });
      }

      res.json({
        success: true,
        data: { scope }
      });

    } catch (error) {
      logger.error('Error fetching scope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch scope'
      });
    }
  }

  /**
   * Get all scopes for a specific user
   * GET /api/pathfinder-scopes/user/:userId
   */
  async getUserScopes(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      // Verify the user exists and is a pathfinder
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (user.role !== UserRole.PATHFINDER) {
        return res.status(400).json({
          success: false,
          error: 'User is not a pathfinder'
        });
      }

      const scopes = await prisma.pathfinderScope.findMany({
        where: { pathfinderId: userId },
        include: {
          cohort: {
            select: { id: true, name: true, description: true }
          },
          specialization: {
            select: { id: true, name: true, description: true }
          },
          league: {
            select: { id: true, name: true, description: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      res.json({
        success: true,
        data: { 
          user: user,
          scopes 
        }
      });

    } catch (error) {
      logger.error('Error fetching user scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user scopes'
      });
    }
  }

  /**
   * Create new pathfinder scope
   * POST /api/pathfinder-scopes
   */
  async createScope(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        pathfinderId,
        cohortId,
        specializationId,
        leagueId,
        canManageUsers = true,
        canViewAnalytics = true,
        canCreateContent = false
      } = req.body;

      const assignerId = req.user!.userId;

      // Validate that at least one scope is specified
      if (!cohortId && !specializationId && !leagueId) {
        return res.status(400).json({
          success: false,
          error: 'At least one scope (cohort, specialization, or league) must be specified'
        });
      }

      // Verify the pathfinder exists and has the correct role
      const pathfinder = await prisma.user.findUnique({
        where: { id: pathfinderId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!pathfinder) {
        return res.status(404).json({
          success: false,
          error: 'Pathfinder not found'
        });
      }

      if (pathfinder.role !== UserRole.PATHFINDER) {
        return res.status(400).json({
          success: false,
          error: 'User must be a pathfinder to assign scopes'
        });
      }

      // Verify scope entities exist if provided
      if (cohortId) {
        const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
        if (!cohort) {
          return res.status(404).json({
            success: false,
            error: 'Cohort not found'
          });
        }
      }

      if (specializationId) {
        const specialization = await prisma.specialization.findUnique({ where: { id: specializationId } });
        if (!specialization) {
          return res.status(404).json({
            success: false,
            error: 'Specialization not found'
          });
        }
      }

      if (leagueId) {
        const league = await prisma.league.findUnique({ where: { id: leagueId } });
        if (!league) {
          return res.status(404).json({
            success: false,
            error: 'League not found'
          });
        }
      }

      // Check if this exact scope already exists
      const existingScope = await prisma.pathfinderScope.findFirst({
        where: {
          pathfinderId,
          cohortId,
          specializationId,
          leagueId
        }
      });

      if (existingScope) {
        return res.status(409).json({
          success: false,
          error: 'This scope assignment already exists'
        });
      }

      // Create the scope
      const scope = await prisma.pathfinderScope.create({
        data: {
          pathfinderId,
          cohortId,
          specializationId,
          leagueId,
          canManageUsers,
          canViewAnalytics,
          canCreateContent,
          assignedById: assignerId
        },
        include: {
          pathfinder: {
            select: { id: true, name: true, email: true, role: true }
          },
          cohort: {
            select: { id: true, name: true, description: true }
          },
          specialization: {
            select: { id: true, name: true, description: true }
          },
          league: {
            select: { id: true, name: true, description: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Audit log
      await createAuditLog({
        userId: assignerId,
        action: AuditAction.USER_CREATED, // Using existing action temporarily
        resourceType: 'PathfinderScope',
        description: `Created pathfinder scope for ${pathfinder.name} (${pathfinder.email})`,
        metadata: {
          scopeId: scope.id,
          pathfinderId,
          cohortId,
          specializationId,
          leagueId,
          permissions: {
            canManageUsers,
            canViewAnalytics,
            canCreateContent
          }
        }
      });

      res.status(201).json({
        success: true,
        data: { scope }
      });

    } catch (error) {
      logger.error('Error creating pathfinder scope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create pathfinder scope'
      });
    }
  }

  /**
   * Update existing scope
   * PUT /api/pathfinder-scopes/:id
   */
  async updateScope(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        canManageUsers,
        canViewAnalytics,
        canCreateContent
      } = req.body;

      const updaterId = req.user!.userId;

      // Find existing scope
      const existingScope = await prisma.pathfinderScope.findUnique({
        where: { id },
        include: {
          pathfinder: {
            select: { name: true, email: true }
          }
        }
      });

      if (!existingScope) {
        return res.status(404).json({
          success: false,
          error: 'Pathfinder scope not found'
        });
      }

      // Update only permission fields
      const updateData: any = {};
      if (canManageUsers !== undefined) updateData.canManageUsers = canManageUsers;
      if (canViewAnalytics !== undefined) updateData.canViewAnalytics = canViewAnalytics;
      if (canCreateContent !== undefined) updateData.canCreateContent = canCreateContent;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const updatedScope = await prisma.pathfinderScope.update({
        where: { id },
        data: updateData,
        include: {
          pathfinder: {
            select: { id: true, name: true, email: true, role: true }
          },
          cohort: {
            select: { id: true, name: true, description: true }
          },
          specialization: {
            select: { id: true, name: true, description: true }
          },
          league: {
            select: { id: true, name: true, description: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Audit log
      await createAuditLog({
        userId: updaterId,
        action: AuditAction.USER_ROLE_CHANGED, // Using existing action temporarily
        resourceType: 'PathfinderScope',
        description: `Updated pathfinder scope for ${existingScope.pathfinder.name} (${existingScope.pathfinder.email})`,
        metadata: {
          scopeId: id,
          updatedFields: updateData,
          previousValues: {
            canManageUsers: existingScope.canManageUsers,
            canViewAnalytics: existingScope.canViewAnalytics,
            canCreateContent: existingScope.canCreateContent
          }
        }
      });

      res.json({
        success: true,
        data: { scope: updatedScope }
      });

    } catch (error) {
      logger.error('Error updating pathfinder scope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pathfinder scope'
      });
    }
  }

  /**
   * Delete scope
   * DELETE /api/pathfinder-scopes/:id
   */
  async deleteScope(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleterId = req.user!.userId;

      // Find existing scope for audit logging
      const existingScope = await prisma.pathfinderScope.findUnique({
        where: { id },
        include: {
          pathfinder: {
            select: { name: true, email: true }
          }
        }
      });

      if (!existingScope) {
        return res.status(404).json({
          success: false,
          error: 'Pathfinder scope not found'
        });
      }

      await prisma.pathfinderScope.delete({
        where: { id }
      });

      // Audit log
      await createAuditLog({
        userId: deleterId,
        action: AuditAction.USER_ROLE_CHANGED, // Using existing action temporarily
        resourceType: 'PathfinderScope',
        description: `Deleted pathfinder scope for ${existingScope.pathfinder.name} (${existingScope.pathfinder.email})`,
        metadata: {
          scopeId: id,
          pathfinderId: existingScope.pathfinderId,
          cohortId: existingScope.cohortId,
          specializationId: existingScope.specializationId,
          leagueId: existingScope.leagueId,
          permissions: {
            canManageUsers: existingScope.canManageUsers,
            canViewAnalytics: existingScope.canViewAnalytics,
            canCreateContent: existingScope.canCreateContent
          }
        }
      });

      res.json({
        success: true,
        message: 'Pathfinder scope deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting pathfinder scope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete pathfinder scope'
      });
    }
  }

  /**
   * Bulk assign scopes to multiple users
   * POST /api/pathfinder-scopes/bulk-assign
   */
  async bulkAssignScopes(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        pathfinderIds,
        cohortId,
        specializationId,
        leagueId,
        canManageUsers = true,
        canViewAnalytics = true,
        canCreateContent = false
      } = req.body;

      const assignerId = req.user!.userId;

      if (!Array.isArray(pathfinderIds) || pathfinderIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'pathfinderIds must be a non-empty array'
        });
      }

      // Validate that at least one scope is specified
      if (!cohortId && !specializationId && !leagueId) {
        return res.status(400).json({
          success: false,
          error: 'At least one scope (cohort, specialization, or league) must be specified'
        });
      }

      // Verify all pathfinders exist and have correct role
      const pathfinders = await prisma.user.findMany({
        where: { 
          id: { in: pathfinderIds },
          role: UserRole.PATHFINDER
        },
        select: { id: true, name: true, email: true }
      });

      if (pathfinders.length !== pathfinderIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Some users are not found or not pathfinders'
        });
      }

      const results = [];
      const errors = [];

      for (const pathfinder of pathfinders) {
        try {
          // Check if scope already exists
          const existingScope = await prisma.pathfinderScope.findFirst({
            where: {
              pathfinderId: pathfinder.id,
              cohortId,
              specializationId,
              leagueId
            }
          });

          if (existingScope) {
            errors.push({
              pathfinderId: pathfinder.id,
              pathfinderName: pathfinder.name,
              error: 'Scope already exists'
            });
            continue;
          }

          const scope = await prisma.pathfinderScope.create({
            data: {
              pathfinderId: pathfinder.id,
              cohortId,
              specializationId,
              leagueId,
              canManageUsers,
              canViewAnalytics,
              canCreateContent,
              assignedById: assignerId
            },
            include: {
              pathfinder: {
                select: { id: true, name: true, email: true, role: true }
              }
            }
          });

          results.push(scope);

          // Audit log for each assignment
          await createAuditLog({
            userId: assignerId,
            action: AuditAction.USER_ENROLLED, // Using existing action temporarily
            resourceType: 'PathfinderScope',
            description: `Bulk assigned pathfinder scope to ${pathfinder.name} (${pathfinder.email})`,
            metadata: {
              scopeId: scope.id,
              pathfinderId: pathfinder.id,
              cohortId,
              specializationId,
              leagueId,
              bulkOperation: true
            }
          });

        } catch (error) {
          errors.push({
            pathfinderId: pathfinder.id,
            pathfinderName: pathfinder.name,
            error: 'Failed to create scope'
          });
        }
      }

      res.json({
        success: true,
        data: {
          created: results,
          errors,
          summary: {
            total: pathfinderIds.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      logger.error('Error bulk assigning scopes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk assign scopes'
      });
    }
  }

  /**
   * Get users within a pathfinder's scope
   * GET /api/pathfinder-scopes/scope/:scopeId/users
   */
  async getUsersInScope(req: AuthenticatedRequest, res: Response) {
    try {
      const { scopeId } = req.params;

      const scope = await prisma.pathfinderScope.findUnique({
        where: { id: scopeId },
        include: {
          cohort: true,
          specialization: true,
          league: true
        }
      });

      if (!scope) {
        return res.status(404).json({
          success: false,
          error: 'Pathfinder scope not found'
        });
      }

      // Build query to find users within this scope
      const userQuery: any = {
        role: UserRole.PIONEER // Only pioneers are managed by pathfinders
      };

      // Add scope-specific filters using proper relations
      if (scope.cohortId) {
        userQuery.enrollments = {
          some: {
            cohortId: scope.cohortId
          }
        };
      }
      if (scope.specializationId) {
        userQuery.specializations = {
          some: {
            specializationId: scope.specializationId
          }
        };
      }
      if (scope.leagueId) {
        userQuery.enrollments = {
          some: {
            leagueId: scope.leagueId
          }
        };
      }

      const users = await prisma.user.findMany({
        where: userQuery,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          enrollments: {
            select: {
              cohort: { select: { id: true, name: true } },
              league: { select: { id: true, name: true } }
            }
          },
          specializations: {
            select: {
              specialization: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: {
          scope,
          users,
          count: users.length
        }
      });

    } catch (error) {
      logger.error('Error fetching users in scope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users in scope'
      });
    }
  }

  /**
   * Check if user has permission for specific action in scope
   * POST /api/pathfinder-scopes/check-permission
   */
  async checkPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        pathfinderId,
        permission, // 'canManageUsers', 'canViewAnalytics', 'canCreateContent'
        cohortId,
        specializationId,
        leagueId
      } = req.body;

      const checkerId = req.user!.userId;

      if (!pathfinderId || !permission) {
        return res.status(400).json({
          success: false,
          error: 'pathfinderId and permission are required'
        });
      }

      if (!['canManageUsers', 'canViewAnalytics', 'canCreateContent'].includes(permission)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid permission type'
        });
      }

      // Find matching scopes
      const scopes = await prisma.pathfinderScope.findMany({
        where: {
          pathfinderId,
          ...(cohortId && { cohortId }),
          ...(specializationId && { specializationId }),
          ...(leagueId && { leagueId })
        }
      });

      // Check if any scope grants the requested permission
      const hasPermission = scopes.some(scope => scope[permission as keyof typeof scope] === true);

      // Audit log
      await createAuditLog({
        userId: checkerId,
        action: AuditAction.USER_ROLE_CHANGED, // Using existing action temporarily
        resourceType: 'PathfinderScope',
        description: `Checked permission ${permission} for pathfinder ${pathfinderId}`,
        metadata: {
          pathfinderId,
          permission,
          cohortId,
          specializationId,
          leagueId,
          hasPermission,
          matchingScopes: scopes.length
        }
      });

      res.json({
        success: true,
        data: {
          hasPermission,
          matchingScopes: scopes.length,
          permission,
          scopes
        }
      });

    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check permission'
      });
    }
  }
}
