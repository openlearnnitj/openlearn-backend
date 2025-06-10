
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TokenPayload } from '../types';

const prisma = new PrismaClient();

export class BadgeController {
  /**
   * Get all badges in the system
   * GET /api/badges
   * Access: All authenticated users
   */
  static async getAllBadges(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;
      
      const badges = await prisma.badge.findMany({
        include: {
          league: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          userBadges: {
            where: {
              userId: currentUser.userId
            },
            select: {
              id: true,
              earnedAt: true
            }
          },
          _count: {
            select: {
              userBadges: true // Total users who earned this badge
            }
          }
        },
        orderBy: [
          { league: { name: 'asc' } },
          { createdAt: 'asc' }
        ]
      });

      const formattedBadges = badges.map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        league: badge.league,
        earnedByUser: badge.userBadges.length > 0,
        earnedAt: badge.userBadges.length > 0 ? badge.userBadges[0].earnedAt : null,
        totalEarners: badge._count.userBadges,
        createdAt: badge.createdAt
      }));

      res.status(200).json({
        success: true,
        data: {
          badges: formattedBadges,
          total: formattedBadges.length,
          earnedCount: formattedBadges.filter(b => b.earnedByUser).length
        },
        message: 'Badges retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting badges:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving badges'
      });
    }
  }

  /**
   * Get user's earned badges
   * GET /api/badges/my-badges
   * Access: All authenticated users
   */
  static async getMyBadges(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;
      
      const userBadges = await prisma.userBadge.findMany({
        where: {
          userId: currentUser.userId
        },
        include: {
          badge: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          }
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });

      const formattedBadges = userBadges.map(userBadge => ({
        id: userBadge.badge.id,
        name: userBadge.badge.name,
        description: userBadge.badge.description,
        imageUrl: userBadge.badge.imageUrl,
        league: userBadge.badge.league,
        earnedAt: userBadge.earnedAt
      }));

      res.status(200).json({
        success: true,
        data: {
          badges: formattedBadges,
          total: formattedBadges.length
        },
        message: 'User badges retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting user badges:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving user badges'
      });
    }
  }

  /**
   * Create a new badge (Admin/Chief Pathfinder+ only)
   * POST /api/badges
   * Access: Chief Pathfinder, Grand Pathfinder
   */
  static async createBadge(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, imageUrl, leagueId } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!name || !leagueId) {
        res.status(400).json({
          success: false,
          error: 'Name and leagueId are required'
        });
        return;
      }

      // Validate league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found'
        });
        return;
      }

      // Check if badge already exists for this league
      const existingBadge = await prisma.badge.findFirst({
        where: { leagueId: leagueId }
      });

      if (existingBadge) {
        res.status(400).json({
          success: false,
          error: 'A badge already exists for this league'
        });
        return;
      }

      // Create the badge
      const badge = await prisma.badge.create({
        data: {
          name,
          description,
          imageUrl,
          leagueId
        },
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'BADGE_CREATED',
          description: `Created badge: ${badge.name} for league: ${badge.league.name}`,
          metadata: {
            badgeId: badge.id,
            leagueId: badge.leagueId,
            badgeName: badge.name
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          badge: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl,
            league: badge.league,
            createdAt: badge.createdAt
          }
        },
        message: 'Badge created successfully'
      });

    } catch (error) {
      console.error('Error creating badge:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating badge'
      });
    }
  }

  /**
   * Update a badge (Admin/Chief Pathfinder+ only)
   * PUT /api/badges/:id
   * Access: Chief Pathfinder, Grand Pathfinder
   */
  static async updateBadge(req: Request, res: Response): Promise<void> {
    try {
      const { id: badgeId } = req.params;
      const { name, description, imageUrl } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if badge exists
      const existingBadge = await prisma.badge.findUnique({
        where: { id: badgeId },
        include: {
          league: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!existingBadge) {
        res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
        return;
      }

      // Prepare update data (only include provided fields)
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one field (name, description, imageUrl) must be provided'
        });
        return;
      }

      // Update the badge
      const updatedBadge = await prisma.badge.update({
        where: { id: badgeId },
        data: updateData,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'BADGE_UPDATED',
          description: `Updated badge: ${updatedBadge.name}`,
          metadata: {
            badgeId: updatedBadge.id,
            updatedFields: Object.keys(updateData),
            previousData: {
              name: existingBadge.name,
              description: existingBadge.description,
              imageUrl: existingBadge.imageUrl
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          badge: {
            id: updatedBadge.id,
            name: updatedBadge.name,
            description: updatedBadge.description,
            imageUrl: updatedBadge.imageUrl,
            league: updatedBadge.league,
            updatedAt: updatedBadge.updatedAt
          }
        },
        message: 'Badge updated successfully'
      });

    } catch (error) {
      console.error('Error updating badge:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating badge'
      });
    }
  }

  /**
   * Manually award a badge to a user (Admin/Pathfinder+ only)
   * POST /api/badges/:id/award
   * Access: Pathfinder, Chief Pathfinder, Grand Pathfinder
   */
  static async awardBadge(req: Request, res: Response): Promise<void> {
    try {
      const { id: badgeId } = req.params;
      const { userId, reason } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required'
        });
        return;
      }

      // Check if badge exists
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
        include: {
          league: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!badge) {
        res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
        return;
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'Target user not found'
        });
        return;
      }

      // Check if user already has this badge
      const existingUserBadge = await prisma.userBadge.findFirst({
        where: {
          userId: userId,
          badgeId: badgeId
        }
      });

      if (existingUserBadge) {
        res.status(400).json({
          success: false,
          error: 'User already has this badge'
        });
        return;
      }

      // Award the badge
      const userBadge = await prisma.userBadge.create({
        data: {
          userId: userId,
          badgeId: badgeId
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'BADGE_MANUALLY_AWARDED',
          description: `Manually awarded badge: ${badge.name} to user: ${targetUser.name}${reason ? ` - Reason: ${reason}` : ''}`,
          metadata: {
            badgeId: badgeId,
            awardedToUserId: userId,
            awardedByUserId: currentUser.userId,
            reason: reason || null,
            badgeName: badge.name,
            targetUserEmail: targetUser.email
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          userBadge: {
            id: userBadge.id,
            badge: {
              id: badge.id,
              name: badge.name,
              description: badge.description,
              league: badge.league
            },
            user: {
              id: targetUser.id,
              name: targetUser.name,
              email: targetUser.email
            },
            earnedAt: userBadge.earnedAt
          }
        },
        message: 'Badge awarded successfully'
      });

    } catch (error) {
      console.error('Error awarding badge:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while awarding badge'
      });
    }
  }

  /**
   * Revoke a badge from a user (Admin/Chief Pathfinder+ only)
   * DELETE /api/badges/:id/revoke
   * Access: Chief Pathfinder, Grand Pathfinder
   */
  static async revokeBadge(req: Request, res: Response): Promise<void> {
    try {
      const { id: badgeId } = req.params;
      const { userId, reason } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required'
        });
        return;
      }

      // Check if user has this badge
      const userBadge = await prisma.userBadge.findFirst({
        where: {
          userId: userId,
          badgeId: badgeId
        },
        include: {
          badge: {
            include: {
              league: {
                select: {
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!userBadge) {
        res.status(404).json({
          success: false,
          error: 'User does not have this badge'
        });
        return;
      }

      // Delete the user badge
      await prisma.userBadge.delete({
        where: { id: userBadge.id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'BADGE_REVOKED',
          description: `Revoked badge: ${userBadge.badge.name} from user: ${userBadge.user.name}${reason ? ` - Reason: ${reason}` : ''}`,
          metadata: {
            badgeId: badgeId,
            revokedFromUserId: userId,
            revokedByUserId: currentUser.userId,
            reason: reason || null,
            badgeName: userBadge.badge.name,
            targetUserEmail: userBadge.user.email
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Badge revoked successfully'
      });

    } catch (error) {
      console.error('Error revoking badge:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while revoking badge'
      });
    }
  }

  /**
   * Get badge analytics (Admin/Chief Pathfinder+ only)
   * GET /api/badges/analytics
   * Access: Chief Pathfinder, Grand Pathfinder
   */
  static async getBadgeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Get total badges
      const totalBadges = await prisma.badge.count();

      // Get badge earning statistics
      const badgeStats = await prisma.badge.findMany({
        include: {
          league: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              userBadges: true
            }
          }
        },
        orderBy: {
          userBadges: {
            _count: 'desc'
          }
        }
      });

      // Get recent badge awards
      const recentAwards = await prisma.userBadge.findMany({
        take: 10,
        orderBy: {
          earnedAt: 'desc'
        },
        include: {
          badge: {
            select: {
              name: true,
              league: {
                select: {
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Calculate totals
      const totalAwarded = await prisma.userBadge.count();
      const uniqueEarners = await prisma.userBadge.groupBy({
        by: ['userId']
      });

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalBadges,
            totalAwarded,
            uniqueEarners: uniqueEarners.length,
            averageBadgesPerUser: uniqueEarners.length > 0 ? (totalAwarded / uniqueEarners.length).toFixed(2) : 0
          },
          badgePopularity: badgeStats.map(badge => ({
            id: badge.id,
            name: badge.name,
            league: badge.league.name,
            timesEarned: badge._count.userBadges
          })),
          recentAwards: recentAwards.map(award => ({
            id: award.id,
            badge: {
              name: award.badge.name,
              league: award.badge.league.name
            },
            user: {
              name: award.user.name,
              email: award.user.email
            },
            earnedAt: award.earnedAt
          }))
        },
        message: 'Badge analytics retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting badge analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving badge analytics'
      });
    }
  }

  /**
   * Delete a badge (Admin/Grand Pathfinder only)
   * DELETE /api/badges/:id
   * Access: Grand Pathfinder only
   */
  static async deleteBadge(req: Request, res: Response): Promise<void> {
    try {
      const { id: badgeId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check if badge exists
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
        include: {
          league: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              userBadges: true
            }
          }
        }
      });

      if (!badge) {
        res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
        return;
      }

      // Check if badge has been awarded to users
      if (badge._count.userBadges > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete badge. It has been awarded to ${badge._count.userBadges} user(s). Consider revoking all awards first.`
        });
        return;
      }

      // Delete the badge
      await prisma.badge.delete({
        where: { id: badgeId }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'BADGE_DELETED',
          description: `Deleted badge: ${badge.name} (League: ${badge.league.name})`,
          metadata: {
            badgeId: badgeId,
            badgeName: badge.name,
            leagueName: badge.league.name
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Badge deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting badge:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while deleting badge'
      });
    }
  }
}
