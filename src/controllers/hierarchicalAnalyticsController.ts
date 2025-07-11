import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';

export class HierarchicalAnalyticsController {
  /**
   * Get hierarchical count analytics for frontend
   * Returns total and completed counts for all hierarchy levels
   * 
   * Hierarchy: League → Week → Section → Resource
   * 
   * Query Parameters:
   * - userId (optional): specific user ID, defaults to current user
   * - leagueId (optional): get detailed breakdown for specific league
   * - weekId (optional): get counts for specific week
   * - sectionId (optional): get counts for specific section
   */
  static async getHierarchicalCounts(req: Request, res: Response): Promise<void> {
    try {
      const { userId, leagueId, weekId, sectionId } = req.query;
      const user = req.user as TokenPayload;
      
      // If no userId provided, use current user
      const targetUserId = userId as string || user.userId;

      // Base response structure
      const response: any = {
        success: true,
        data: {
          userId: targetUserId,
          timestamp: new Date().toISOString()
        },
        message: 'Hierarchical count analytics retrieved successfully'
      };

      // Global counts - always included
      const [totalLeagues, totalWeeks, totalSections, totalResources] = await Promise.all([
        prisma.league.count(),
        prisma.week.count(),
        prisma.section.count(),
        prisma.sectionResource.count()
      ]);

      // User progress counts - always included
      const [userCompletedSections, userCompletedResources] = await Promise.all([
        prisma.sectionProgress.count({
          where: { userId: targetUserId, isCompleted: true }
        }),
        prisma.resourceProgress.count({
          where: { userId: targetUserId, isCompleted: true }
        })
      ]);

      // Add global data
      response.data.global = {
        totals: {
          leagues: totalLeagues,
          weeks: totalWeeks,
          sections: totalSections,
          resources: totalResources
        },
        completed: {
          sections: userCompletedSections,
          resources: userCompletedResources
        },
        completionPercentages: {
          sections: totalSections > 0 ? Math.round((userCompletedSections / totalSections) * 100) : 0,
          resources: totalResources > 0 ? Math.round((userCompletedResources / totalResources) * 100) : 0
        }
      };

      // League-specific data
      if (leagueId) {
        const leagueData = await this.getLeagueDetails(leagueId as string, targetUserId);
        response.data.league = leagueData;
      }

      // Week-specific data
      if (weekId) {
        const weekData = await this.getWeekDetails(weekId as string, targetUserId);
        response.data.week = weekData;
      }

      // Section-specific data
      if (sectionId) {
        const sectionData = await this.getSectionDetails(sectionId as string, targetUserId);
        response.data.section = sectionData;
      }

      res.status(200).json(response);
    } catch (error) {
      console.error('Get hierarchical counts error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve hierarchical analytics'
      });
    }
  }

  /**
   * Get detailed league analytics
   */
  private static async getLeagueDetails(leagueId: string, userId: string) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        weeks: {
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                resources: { orderBy: { order: 'asc' } },
                progress: {
                  where: { userId },
                  select: { isCompleted: true }
                }
              }
            }
          }
        }
      }
    });

    if (!league) return null;

    // Get resource progress for this league
    const resourceProgress = await prisma.resourceProgress.findMany({
      where: {
        userId,
        resource: {
          section: {
            week: { leagueId }
          }
        }
      },
      select: { resourceId: true, isCompleted: true }
    });

    const resourceProgressMap = new Map(
      resourceProgress.map(rp => [rp.resourceId, rp.isCompleted])
    );

    // Calculate totals for the league
    let totalWeeks = league.weeks.length;
    let totalSections = 0;
    let totalResources = 0;
    let completedSections = 0;
    let completedResources = 0;
    let completedWeeks = 0;

    const weeks = league.weeks.map(week => {
      const weekTotalSections = week.sections.length;
      const weekCompletedSections = week.sections.filter(section => 
        section.progress.some(p => p.isCompleted)
      ).length;
      
      const weekTotalResources = week.sections.reduce((sum, section) => 
        sum + section.resources.length, 0
      );
      const weekCompletedResources = week.sections.reduce((sum, section) => 
        sum + section.resources.filter(resource => 
          resourceProgressMap.get(resource.id) === true
        ).length, 0
      );

      totalSections += weekTotalSections;
      totalResources += weekTotalResources;
      completedSections += weekCompletedSections;
      completedResources += weekCompletedResources;

      // Week is completed if all sections are completed
      const isWeekCompleted = weekTotalSections > 0 && weekCompletedSections === weekTotalSections;
      if (isWeekCompleted) completedWeeks++;

      return {
        weekId: week.id,
        weekName: week.name,
        order: week.order,
        totalSections: weekTotalSections,
        completedSections: weekCompletedSections,
        totalResources: weekTotalResources,
        completedResources: weekCompletedResources,
        isCompleted: isWeekCompleted,
        completionPercentage: {
          sections: weekTotalSections > 0 ? Math.round((weekCompletedSections / weekTotalSections) * 100) : 0,
          resources: weekTotalResources > 0 ? Math.round((weekCompletedResources / weekTotalResources) * 100) : 0
        },
        sections: week.sections.map(section => {
          const sectionCompletedResources = section.resources.filter(resource => 
            resourceProgressMap.get(resource.id) === true
          ).length;

          return {
            sectionId: section.id,
            sectionName: section.name,
            order: section.order,
            totalResources: section.resources.length,
            completedResources: sectionCompletedResources,
            isCompleted: section.progress.some(p => p.isCompleted),
            completionPercentage: section.resources.length > 0 ? 
              Math.round((sectionCompletedResources / section.resources.length) * 100) : 0,
            resources: section.resources.map(resource => ({
              resourceId: resource.id,
              title: resource.title,
              type: resource.type,
              order: resource.order,
              isCompleted: resourceProgressMap.get(resource.id) === true
            }))
          };
        })
      };
    });

    return {
      leagueId: league.id,
      leagueName: league.name,
      description: league.description,
      totals: {
        weeks: totalWeeks,
        sections: totalSections,
        resources: totalResources
      },
      completed: {
        weeks: completedWeeks,
        sections: completedSections,
        resources: completedResources
      },
      completionPercentages: {
        weeks: totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0,
        sections: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
        resources: totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0
      },
      weeks
    };
  }

  /**
   * Get detailed week analytics
   */
  private static async getWeekDetails(weekId: string, userId: string) {
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        league: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            resources: { orderBy: { order: 'asc' } },
            progress: {
              where: { userId },
              select: { isCompleted: true }
            }
          }
        }
      }
    });

    if (!week) return null;

    // Get resource progress for this week
    const resourceProgress = await prisma.resourceProgress.findMany({
      where: {
        userId,
        resource: {
          section: { weekId }
        }
      },
      select: { resourceId: true, isCompleted: true }
    });

    const resourceProgressMap = new Map(
      resourceProgress.map(rp => [rp.resourceId, rp.isCompleted])
    );

    const totalSections = week.sections.length;
    const totalResources = week.sections.reduce((sum, section) => sum + section.resources.length, 0);
    const completedSections = week.sections.filter(section => 
      section.progress.some(p => p.isCompleted)
    ).length;
    const completedResources = week.sections.reduce((sum, section) => 
      sum + section.resources.filter(resource => resourceProgressMap.get(resource.id) === true).length, 0
    );

    return {
      weekId: week.id,
      weekName: week.name,
      order: week.order,
      league: week.league,
      totals: {
        sections: totalSections,
        resources: totalResources
      },
      completed: {
        sections: completedSections,
        resources: completedResources
      },
      completionPercentages: {
        sections: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
        resources: totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0
      }
    };
  }

  /**
   * Get detailed section analytics
   */
  private static async getSectionDetails(sectionId: string, userId: string) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        week: {
          include: {
            league: { select: { id: true, name: true } }
          }
        },
        resources: { orderBy: { order: 'asc' } },
        progress: {
          where: { userId },
          select: { isCompleted: true }
        }
      }
    });

    if (!section) return null;

    // Get resource progress for this section
    const resourceProgress = await prisma.resourceProgress.findMany({
      where: {
        userId,
        resource: { sectionId }
      },
      select: { resourceId: true, isCompleted: true }
    });

    const resourceProgressMap = new Map(
      resourceProgress.map(rp => [rp.resourceId, rp.isCompleted])
    );

    const totalResources = section.resources.length;
    const completedResources = section.resources.filter(resource => 
      resourceProgressMap.get(resource.id) === true
    ).length;

    return {
      sectionId: section.id,
      sectionName: section.name,
      order: section.order,
      week: {
        weekId: section.week.id,
        weekName: section.week.name,
        league: section.week.league
      },
      totals: {
        resources: totalResources
      },
      completed: {
        resources: completedResources
      },
      completionPercentages: {
        resources: totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0
      },
      isCompleted: section.progress.some(p => p.isCompleted),
      resources: section.resources.map(resource => ({
        resourceId: resource.id,
        title: resource.title,
        type: resource.type,
        order: resource.order,
        isCompleted: resourceProgressMap.get(resource.id) === true
      }))
    };
  }
}
