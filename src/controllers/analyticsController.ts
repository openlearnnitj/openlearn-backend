import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';

export class AnalyticsController {
  /**
   * Get platform overview statistics (Admin only)
   */
  static async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        pendingUsers,
        totalEnrollments,
        totalCohorts,
        totalLeagues,
        totalSections,
        completedSections,
        totalBadgesEarned,
        totalSpecializationsCompleted
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.enrollment.count(),
        prisma.cohort.count(),
        prisma.league.count(),
        prisma.section.count(),
        prisma.sectionProgress.count({ where: { isCompleted: true } }),
        prisma.userBadge.count(),
        prisma.userSpecialization.count()
      ]);

      const completionRate = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            pending: pendingUsers,
            suspended: totalUsers - activeUsers - pendingUsers
          },
          learning: {
            totalEnrollments,
            totalCohorts,
            totalLeagues,
            totalSections,
            completedSections,
            overallCompletionRate: completionRate
          },
          achievements: {
            totalBadgesEarned,
            totalSpecializationsCompleted
          }
        },
        message: 'Platform statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get platform stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get cohort performance analytics (Admin only)
   */
  static async getCohortAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { cohortId } = req.params;

      // Get cohort with detailed analytics
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        include: {
          enrollments: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true }
              },
              league: {
                select: { id: true, name: true }
              }
            }
          },
          specializations: {
            include: {
              leagues: {
                include: {
                  league: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!cohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found'
        });
        return;
      }

      // Calculate progress for each league in this cohort
      const leagueProgress = await Promise.all(
        cohort.enrollments.map(async (enrollment) => {
          const [totalSections, completedSections] = await Promise.all([
            prisma.section.count({
              where: {
                week: { leagueId: enrollment.league.id }
              }
            }),
            prisma.sectionProgress.count({
              where: {
                userId: enrollment.user.id,
                isCompleted: true,
                section: {
                  week: { leagueId: enrollment.league.id }
                }
              }
            })
          ]);

          return {
            userId: enrollment.user.id,
            userName: enrollment.user.name,
            userEmail: enrollment.user.email,
            league: enrollment.league,
            totalSections,
            completedSections,
            progressPercentage: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          cohort: {
            id: cohort.id,
            name: cohort.name,
            description: cohort.description,
            isActive: cohort.isActive
          },
          analytics: {
            totalEnrollments: cohort.enrollments.length,
            totalSpecializations: cohort.specializations.length,
            leagueProgress
          }
        },
        message: 'Cohort analytics retrieved successfully'
      });
    } catch (error) {
      console.error('Get cohort analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user performance report (Admin or self)
   */
  static async getUserReport(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Check permissions
      if (userId !== currentUser.userId) {
        if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view user report'
          });
          return;
        }
      }

      // Get user with comprehensive data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get enrollments with progress
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          cohort: { select: { id: true, name: true } },
          league: { select: { id: true, name: true } }
        }
      });

      // Calculate progress for each enrollment
      const progressData = await Promise.all(
        enrollments.map(async (enrollment) => {
          const [totalSections, completedSections] = await Promise.all([
            prisma.section.count({
              where: {
                week: { leagueId: enrollment.leagueId }
              }
            }),
            prisma.sectionProgress.count({
              where: {
                userId,
                isCompleted: true,
                section: {
                  week: { leagueId: enrollment.leagueId }
                }
              }
            })
          ]);

          return {
            enrollment,
            totalSections,
            completedSections,
            progressPercentage: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
          };
        })
      );

      // Get badges and specializations
      const [badges, specializations] = await Promise.all([
        prisma.userBadge.count({ where: { userId } }),
        prisma.userSpecialization.count({ where: { userId } })
      ]);

      res.status(200).json({
        success: true,
        data: {
          user,
          summary: {
            totalEnrollments: enrollments.length,
            badgesEarned: badges,
            specializationsCompleted: specializations,
            averageProgress: progressData.length > 0 
              ? Math.round(progressData.reduce((sum, p) => sum + p.progressPercentage, 0) / progressData.length)
              : 0
          },
          progressData
        },
        message: 'User report retrieved successfully'
      });
    } catch (error) {
      console.error('Get user report error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }


}
