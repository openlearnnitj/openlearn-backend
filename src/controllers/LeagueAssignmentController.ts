/**
 * League Assignment Controller
 * Manages league access assignments for Pathfinders by Grand Pathfinder
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuditAction, UserRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Create audit log helper
 */
async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
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

export class LeagueAssignmentController {
  /**
   * Assign leagues to a pathfinder
   * POST /api/admin/assign-leagues
   */
  static async assignLeaguesToPathfinder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pathfinderId, leagueIds, permissions } = req.body;
      const assignedBy = req.user!;

      // Validate inputs
      if (!pathfinderId || !Array.isArray(leagueIds) || leagueIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'pathfinderId and leagueIds array are required'
        });
        return;
      }

      // Check if target user exists and is a pathfinder
      const targetUser = await prisma.user.findUnique({
        where: { id: pathfinderId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      if (targetUser.role !== UserRole.PATHFINDER && targetUser.role !== UserRole.CHIEF_PATHFINDER) {
        res.status(400).json({
          success: false,
          error: 'User must be a PATHFINDER or CHIEF_PATHFINDER to assign leagues'
        });
        return;
      }

      // Validate all league IDs exist
      const leagues = await prisma.league.findMany({
        where: { id: { in: leagueIds } },
        select: { id: true, name: true }
      });

      if (leagues.length !== leagueIds.length) {
        const foundIds = leagues.map(l => l.id);
        const missingIds = leagueIds.filter(id => !foundIds.includes(id));
        res.status(400).json({
          success: false,
          error: 'Some league IDs are invalid',
          missingLeagueIds: missingIds
        });
        return;
      }

      // Remove existing scopes for this pathfinder
      await prisma.pathfinderScope.deleteMany({
        where: { pathfinderId }
      });

      // Create new scopes for each league
      const scopeData = leagueIds.map(leagueId => ({
        pathfinderId,
        leagueId,
        canManageUsers: permissions?.canManageUsers ?? true,
        canViewAnalytics: permissions?.canViewAnalytics ?? true,
        canCreateContent: permissions?.canCreateContent ?? false,
        assignedById: assignedBy.userId
      }));

      const createdScopes = await prisma.pathfinderScope.createMany({
        data: scopeData
      });

      // Create audit log
      await createAuditLog({
        userId: assignedBy.userId,
        action: AuditAction.USER_ROLE_CHANGED,
        description: `Assigned ${leagueIds.length} leagues to pathfinder ${targetUser.email}`,
        metadata: {
          targetUserId: pathfinderId,
          targetUserEmail: targetUser.email,
          assignedLeagues: leagues.map(l => ({ id: l.id, name: l.name })),
          permissions: permissions || { canManageUsers: true, canViewAnalytics: true, canCreateContent: false },
          action: 'league_assignment'
        }
      });

      res.status(200).json({
        success: true,
        message: `Successfully assigned ${leagueIds.length} leagues to ${targetUser.name}`,
        data: {
          pathfinder: targetUser,
          assignedLeagues: leagues,
          scopesCreated: createdScopes.count,
          permissions: permissions || { canManageUsers: true, canViewAnalytics: true, canCreateContent: false }
        }
      });

    } catch (error) {
      console.error('Assign leagues error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get league assignments for a pathfinder
   * GET /api/admin/pathfinder-leagues/:pathfinderId
   */
  static async getPathfinderLeagues(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pathfinderId } = req.params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: pathfinderId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get league assignments
      const scopes = await prisma.pathfinderScope.findMany({
        where: { pathfinderId },
        include: {
          league: true,
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: {
          pathfinder: user,
          leagues: scopes.map(scope => ({
            leagueId: scope.leagueId,
            league: scope.league,
            permissions: {
              canManageUsers: scope.canManageUsers,
              canViewAnalytics: scope.canViewAnalytics,
              canCreateContent: scope.canCreateContent
            },
            assignedAt: scope.assignedAt,
            assignedBy: scope.assignedBy
          })),
          totalLeagues: scopes.length
        },
        message: `Retrieved ${scopes.length} league assignments for ${user.name}`
      });

    } catch (error) {
      console.error('Get pathfinder leagues error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Remove league assignment from pathfinder
   * DELETE /api/admin/pathfinder-leagues/:pathfinderId/:leagueId
   */
  static async removeLeagueFromPathfinder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pathfinderId, leagueId } = req.params;
      const removedBy = req.user!;

      // Find the scope
      const scope = await prisma.pathfinderScope.findFirst({
        where: { pathfinderId, leagueId },
        include: {
          pathfinder: { select: { name: true, email: true } },
          league: { select: { name: true } }
        }
      });

      if (!scope) {
        res.status(404).json({
          success: false,
          error: 'League assignment not found'
        });
        return;
      }

      // Remove the scope
      await prisma.pathfinderScope.delete({
        where: { id: scope.id }
      });

      // Create audit log
      await createAuditLog({
        userId: removedBy.userId,
        action: AuditAction.USER_ROLE_CHANGED,
        description: `Removed league ${scope.league.name} from pathfinder ${scope.pathfinder.email}`,
        metadata: {
          targetUserId: pathfinderId,
          targetUserEmail: scope.pathfinder.email,
          removedLeague: { id: leagueId, name: scope.league.name },
          action: 'league_removal'
        }
      });

      res.status(200).json({
        success: true,
        message: `Successfully removed league ${scope.league.name} from ${scope.pathfinder.name}`
      });

    } catch (error) {
      console.error('Remove league error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all pathfinders and their league assignments
   * GET /api/admin/pathfinder-assignments
   */
  static async getAllPathfinderAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const pathfinders = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.PATHFINDER, UserRole.CHIEF_PATHFINDER] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true
        },
        orderBy: { name: 'asc' }
      });

      // Get league assignments for each pathfinder separately
      const formattedData = await Promise.all(
        pathfinders.map(async (pathfinder) => {
          const scopes = await prisma.pathfinderScope.findMany({
            where: { pathfinderId: pathfinder.id },
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          });

          return {
            id: pathfinder.id,
            name: pathfinder.name,
            email: pathfinder.email,
            role: pathfinder.role,
            status: pathfinder.status,
            leagues: scopes.map(scope => ({
              leagueId: scope.leagueId,
              league: scope.league,
              permissions: {
                canManageUsers: scope.canManageUsers,
                canViewAnalytics: scope.canViewAnalytics,
                canCreateContent: scope.canCreateContent
              }
            })),
            totalLeagues: scopes.length
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          pathfinders: formattedData,
          totalPathfinders: pathfinders.length
        },
        message: 'Retrieved all pathfinder assignments'
      });

    } catch (error) {
      console.error('Get all assignments error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update permissions for a pathfinder's league assignment
   * PUT /api/admin/pathfinder-leagues/:pathfinderId/:leagueId/permissions
   */
  static async updatePathfinderPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pathfinderId, leagueId } = req.params;
      const { permissions } = req.body;
      const updatedBy = req.user!;

      // Validate required fields
      if (!pathfinderId || !leagueId || !permissions) {
        res.status(400).json({
          success: false,
          error: 'pathfinderId, leagueId, and permissions are required'
        });
        return;
      }

      // Validate permissions structure
      const { canManageUsers, canViewAnalytics, canCreateContent } = permissions;
      if (typeof canManageUsers !== 'boolean' || 
          typeof canViewAnalytics !== 'boolean' || 
          typeof canCreateContent !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'All permission fields must be boolean values'
        });
        return;
      }

      // Check if pathfinder exists and is a PATHFINDER
      const pathfinder = await prisma.user.findUnique({
        where: { id: pathfinderId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!pathfinder) {
        res.status(404).json({
          success: false,
          error: 'Pathfinder not found'
        });
        return;
      }

      if (pathfinder.role !== UserRole.PATHFINDER) {
        res.status(400).json({
          success: false,
          error: 'User is not a pathfinder'
        });
        return;
      }

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { id: true, name: true }
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found'
        });
        return;
      }

      // Find and update the pathfinder scope
      const scope = await prisma.pathfinderScope.findFirst({
        where: {
          pathfinderId: pathfinderId,
          leagueId: leagueId
        }
      });

      if (!scope) {
        res.status(404).json({
          success: false,
          error: 'League assignment not found'
        });
        return;
      }

      // Update the permissions
      const updatedScope = await prisma.pathfinderScope.update({
        where: { id: scope.id },
        data: {
          canManageUsers,
          canViewAnalytics,
          canCreateContent
        }
      });

      // Create audit log
      await createAuditLog({
        userId: pathfinderId,
        action: AuditAction.PATHFINDER_SCOPE_UPDATED,
        description: `Permissions updated for league: ${league.name}`,
        metadata: {
          scopeId: scope.id,
          leagueId: league.id,
          leagueName: league.name,
          oldPermissions: {
            canManageUsers: scope.canManageUsers,
            canViewAnalytics: scope.canViewAnalytics,
            canCreateContent: scope.canCreateContent
          },
          newPermissions: {
            canManageUsers,
            canViewAnalytics,
            canCreateContent
          },
          updatedBy: updatedBy.userId,
          updatedAt: new Date().toISOString()
        }
      });

      res.status(200).json({
        success: true,
        data: {
          pathfinder: {
            id: pathfinder.id,
            name: pathfinder.name,
            email: pathfinder.email
          },
          league: {
            id: league.id,
            name: league.name
          },
          permissions: {
            canManageUsers: updatedScope.canManageUsers,
            canViewAnalytics: updatedScope.canViewAnalytics,
            canCreateContent: updatedScope.canCreateContent
          },
          updatedAt: new Date(),
          updatedBy: {
            id: updatedBy.userId,
            email: updatedBy.email
          }
        },
        message: `Permissions updated successfully for ${pathfinder.name} in league ${league.name}`
      });

    } catch (error) {
      console.error('Update permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
