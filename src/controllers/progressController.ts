import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ValidationUtils } from '../utils/validation';
import { TokenPayload } from '../types';

/**
 * ProgressController handles user progress tracking and enrollment management
 * 
 * Key Features:pending users
edit specialisation
 * 1. User enrollment in cohorts and leagues
 * 2. Section completion tracking with personal notes
 * 3. Progress analytics and statistics  
 * 4. Badge awarding upon league completion
 * 5. Specialization completion tracking
 * 
 * Business Logic:
 * - Users must be enrolled in a cohort/league to track progress
 * - Section completion is tracked with timestamps and optional notes
 * - Progress percentages calculated based on completed sections
 * - Badges automatically awarded when all sections in a league are completed
 * - Specializations completed when all associated leagues are finished
 */
export class ProgressController {

  /**
   * Enroll user in a cohort and league
   * POST /api/progress/enroll
   * Access: All authenticated users (self-enrollment) or Pathfinder+ (enroll others)
   */
  static async enrollUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId: targetUserId, cohortId, leagueId } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validation
      const validation = ValidationUtils.validateRequired({ cohortId, leagueId });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          details: validation.errors
        });
        return;
      }

      // Determine the user to enroll (self or other)
      const userToEnroll = targetUserId || currentUser.userId;
      
      // Check if enrolling someone else (requires Pathfinder+ role)
      if (targetUserId && targetUserId !== currentUser.userId) {
        if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions to enroll other users'
          });
          return;
        }
      }

      // Verify cohort exists and is active
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        select: { id: true, name: true, isActive: true }
      });

      if (!cohort) {
        res.status(404).json({
          success: false,
          error: 'Cohort not found'
        });
        return;
      }

      if (!cohort.isActive) {
        res.status(400).json({
          success: false,
          error: 'Cannot enroll in inactive cohort'
        });
        return;
      }

      // Verify league exists
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

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userToEnroll },
        select: { id: true, name: true, email: true, status: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      if (user.status !== 'ACTIVE') {
        res.status(400).json({
          success: false,
          error: 'Cannot enroll inactive user'
        });
        return;
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId: userToEnroll,
          cohortId: cohortId,
          leagueId: leagueId
        }
      });

      if (existingEnrollment) {
        res.status(409).json({
          success: false,
          error: 'User is already enrolled in this cohort/league combination'
        });
        return;
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: userToEnroll,
          cohortId: cohortId,
          leagueId: leagueId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          cohort: {
            select: {
              id: true,
              name: true
            }
          },
          league: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_ENROLLED',
          description: `User ${user.name} enrolled in ${cohort.name} - ${league.name}`,
          metadata: {
            enrolledUserId: userToEnroll,
            cohortId: cohortId,
            leagueId: leagueId,
            enrolledBy: currentUser.userId
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          enrollment
        },
        message: 'User enrolled successfully'
      });

    } catch (error) {
      console.error('Error enrolling user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while enrolling user'
      });
    }
  }

  /**
   * Mark section as completed and add optional personal notes
   * POST /api/progress/sections/:sectionId/complete
   * Access: All authenticated users (only for their own progress)
   */
  static async markSectionComplete(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const { personalNote, markedForRevision } = req.body;
      const currentUser = req.user as TokenPayload;

      // Verify section exists
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found'
        });
        return;
      }

      // Check if user is enrolled in the league
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: currentUser.userId,
          leagueId: section.week.league.id
        }
      });

      if (!enrollment) {
        res.status(403).json({
          success: false,
          error: 'You must be enrolled in this league to track progress'
        });
        return;
      }

      // Create or update section progress
      const progress = await prisma.sectionProgress.upsert({
        where: {
          userId_sectionId: {
            userId: currentUser.userId,
            sectionId: sectionId
          }
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
          personalNote: personalNote || undefined,
          markedForRevision: markedForRevision || false
        },
        create: {
          userId: currentUser.userId,
          sectionId: sectionId,
          isCompleted: true,
          completedAt: new Date(),
          personalNote: personalNote || undefined,
          markedForRevision: markedForRevision || false
        },
        include: {
          section: {
            select: {
              id: true,
              name: true,
              order: true,
              week: {
                select: {
                  id: true,
                  name: true,
                  league: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'SECTION_COMPLETED',
          description: `Completed section: ${section.name} in ${section.week.name}`,
          metadata: {
            sectionId: sectionId,
            leagueId: section.week.league.id,
            hasPersonalNote: !!personalNote,
            markedForRevision: markedForRevision || false
          }
        }
      });

      // Check if all sections in league are completed for badge awarding
      await ProgressController.checkLeagueCompletion(currentUser.userId, section.week.league.id);

      res.status(200).json({
        success: true,
        data: {
          progress
        },
        message: 'Section marked as completed successfully'
      });

    } catch (error) {
      console.error('Error marking section complete:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating progress'
      });
    }
  }

  /**
   * Update section progress (notes, revision flag) without marking complete
   * PUT /api/progress/sections/:sectionId
   * Access: All authenticated users (only for their own progress)
   */
  static async updateSectionProgress(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const { personalNote, markedForRevision } = req.body;
      const currentUser = req.user as TokenPayload;

      // Verify section exists
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          week: {
            include: {
              league: {
                select: { id: true }
              }
            }
          }
        }
      });

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found'
        });
        return;
      }

      // Check if user is enrolled in the league
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: currentUser.userId,
          leagueId: section.week.league.id
        }
      });

      if (!enrollment) {
        res.status(403).json({
          success: false,
          error: 'You must be enrolled in this league to update progress'
        });
        return;
      }

      // Find existing progress or create new one
      const progress = await prisma.sectionProgress.upsert({
        where: {
          userId_sectionId: {
            userId: currentUser.userId,
            sectionId: sectionId
          }
        },
        update: {
          personalNote: personalNote !== undefined ? personalNote : undefined,
          markedForRevision: markedForRevision !== undefined ? markedForRevision : undefined
        },
        create: {
          userId: currentUser.userId,
          sectionId: sectionId,
          personalNote: personalNote || undefined,
          markedForRevision: markedForRevision || false,
          isCompleted: false
        },
        include: {
          section: {
            select: {
              id: true,
              name: true,
              order: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          progress
        },
        message: 'Section progress updated successfully'
      });

    } catch (error) {
      console.error('Error updating section progress:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating progress'
      });
    }
  }

  /**
   * Get user's progress for a specific league
   * GET /api/progress/leagues/:leagueId
   * Access: All authenticated users (own progress) or Pathfinder+ (any user's progress with ?userId=)
   */
  static async getLeagueProgress(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;
      const { userId } = req.query;
      const currentUser = req.user as TokenPayload;

      // Determine target user
      const targetUserId = userId as string || currentUser.userId;

      // Check permissions for viewing other user's progress
      if (targetUserId !== currentUser.userId) {
        if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view other users\' progress'
          });
          return;
        }
      }

      // Verify league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          weeks: {
            include: {
              sections: {
                include: {
                  progress: {
                    where: {
                      userId: targetUserId
                    }
                  },
                  _count: {
                    select: {
                      resources: true
                    }
                  }
                },
                orderBy: {
                  order: 'asc'
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found'
        });
        return;
      }

      // Check if user is enrolled
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: targetUserId,
          leagueId: leagueId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!enrollment) {
        res.status(404).json({
          success: false,
          error: 'User is not enrolled in this league'
        });
        return;
      }

      // Calculate progress statistics
      const totalSections = league.weeks.reduce((total, week) => total + week.sections.length, 0);
      const completedSections = league.weeks.reduce((total, week) => 
        total + week.sections.filter(section => 
          section.progress.length > 0 && section.progress[0].isCompleted
        ).length, 0
      );

      const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

      // Check if user has earned badge for this league
      const badge = await prisma.userBadge.findFirst({
        where: {
          userId: targetUserId,
          badge: {
            leagueId: leagueId
          }
        },
        include: {
          badge: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          user: enrollment.user,
          league: {
            id: league.id,
            name: league.name,
            description: league.description
          },
          enrollment: {
            enrolledAt: enrollment.enrolledAt
          },
          progress: {
            totalSections,
            completedSections,
            progressPercentage,
            weeks: league.weeks.map(week => ({
              id: week.id,
              name: week.name,
              order: week.order,
              sections: week.sections.map(section => ({
                id: section.id,
                name: section.name,
                order: section.order,
                resourceCount: section._count.resources,
                progress: section.progress.length > 0 ? {
                  isCompleted: section.progress[0].isCompleted,
                  completedAt: section.progress[0].completedAt,
                  personalNote: section.progress[0].personalNote,
                  markedForRevision: section.progress[0].markedForRevision
                } : {
                  isCompleted: false,
                  completedAt: null,
                  personalNote: null,
                  markedForRevision: false
                }
              }))
            }))
          },
          badge: badge ? {
            id: badge.badge.id,
            name: badge.badge.name,
            description: badge.badge.description,
            imageUrl: badge.badge.imageUrl,
            earnedAt: badge.earnedAt
          } : null
        },
        message: 'League progress retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting league progress:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving progress'
      });
    }
  }

  /**
   * Get user's overall progress across all enrollments
   * GET /api/progress/dashboard
   * Access: All authenticated users (own progress) or Pathfinder+ (any user's progress with ?userId=)
   */
  static async getUserDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      const currentUser = req.user as TokenPayload;

      // Determine target user
      const targetUserId = userId as string || currentUser.userId;

      // Check permissions
      if (targetUserId !== currentUser.userId) {
        if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view other users\' dashboard'
          });
          return;
        }
      }

      // Get user with all enrollments and progress
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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

      // Get all enrollments with progress calculation
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: targetUserId },
        include: {
          cohort: {
            select: {
              id: true,
              name: true
            }
          },
          league: {
            select: {
              id: true,
              name: true,
              description: true,
              weeks: {
                select: {
                  sections: {
                    select: {
                      id: true,
                      progress: {
                        where: { userId: targetUserId },
                        select: {
                          isCompleted: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          enrolledAt: 'desc'
        }
      });

      // Calculate progress for each enrollment
      const enrollmentProgress = enrollments.map(enrollment => {
        const totalSections = enrollment.league.weeks.reduce((total, week) => 
          total + week.sections.length, 0
        );
        
        const completedSections = enrollment.league.weeks.reduce((total, week) => 
          total + week.sections.filter(section => 
            section.progress.length > 0 && section.progress[0].isCompleted
          ).length, 0
        );

        const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

        return {
          enrollmentId: enrollment.id,
          cohort: enrollment.cohort,
          league: {
            id: enrollment.league.id,
            name: enrollment.league.name,
            description: enrollment.league.description
          },
          enrolledAt: enrollment.enrolledAt,
          progress: {
            totalSections,
            completedSections,
            progressPercentage
          }
        };
      });

      // Get badges
      const badges = await prisma.userBadge.findMany({
        where: { userId: targetUserId },
        include: {
          badge: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              league: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });

      // Get specializations
      const specializations = await prisma.userSpecialization.findMany({
        where: { userId: targetUserId },
        include: {
          specialization: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: {
          completedAt: 'desc'
        }
      });

      // Calculate overall statistics
      const totalEnrollments = enrollments.length;
      const totalSections = enrollmentProgress.reduce((total, ep) => total + ep.progress.totalSections, 0);
      const totalCompletedSections = enrollmentProgress.reduce((total, ep) => total + ep.progress.completedSections, 0);
      const overallProgress = totalSections > 0 ? Math.round((totalCompletedSections / totalSections) * 100) : 0;

      res.status(200).json({
        success: true,
        data: {
          user,
          statistics: {
            totalEnrollments,
            totalSections,
            totalCompletedSections,
            overallProgress,
            badgesEarned: badges.length,
            specializationsCompleted: specializations.length
          },
          enrollments: enrollmentProgress,
          badges: badges.map(ub => ({
            id: ub.badge.id,
            name: ub.badge.name,
            description: ub.badge.description,
            imageUrl: ub.badge.imageUrl,
            league: ub.badge.league,
            earnedAt: ub.earnedAt
          })),
          specializations: specializations.map(us => ({
            id: us.specialization.id,
            name: us.specialization.name,
            description: us.specialization.description,
            completedAt: us.completedAt
          }))
        },
        message: 'User dashboard retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting user dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving dashboard'
      });
    }
  }

  /**
   * Get all enrollments (admin view)
   * GET /api/progress/enrollments
   * Access: Pathfinder+ only
   */
  static async getAllEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10', cohortId, leagueId, userId } = req.query;
      const currentUser = req.user as TokenPayload;

      // Check permissions
      if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view enrollments'
        });
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter conditions
      const where: any = {};
      if (cohortId) where.cohortId = cohortId as string;
      if (leagueId) where.leagueId = leagueId as string;
      if (userId) where.userId = userId as string;

      // Get enrollments with progress calculation
      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            cohort: {
              select: {
                id: true,
                name: true
              }
            },
            league: {
              select: {
                id: true,
                name: true
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: {
            enrolledAt: 'desc'
          }
        }),
        prisma.enrollment.count({ where })
      ]);

      // Calculate progress for each enrollment
      const enrollmentsWithProgress = await Promise.all(
        enrollments.map(async (enrollment) => {
          // Get section count and completed count for this league
          const [totalSections, completedSections] = await Promise.all([
            prisma.section.count({
              where: {
                week: {
                  leagueId: enrollment.leagueId
                }
              }
            }),
            prisma.sectionProgress.count({
              where: {
                userId: enrollment.userId,
                isCompleted: true,
                section: {
                  week: {
                    leagueId: enrollment.leagueId
                  }
                }
              }
            })
          ]);

          const progressPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

          return {
            ...enrollment,
            progress: {
              totalSections,
              completedSections,
              progressPercentage
            }
          };
        })
      );

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: {
          enrollments: enrollmentsWithProgress,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages
          }
        },
        message: 'Enrollments retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting enrollments:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving enrollments'
      });
    }
  }

  /**
   * Internal helper method to check if user completed all sections in a league
   * and award badge if applicable
   */
  private static async checkLeagueCompletion(userId: string, leagueId: string): Promise<void> {
    try {
      // Get total sections in league
      const totalSections = await prisma.section.count({
        where: {
          week: {
            leagueId: leagueId
          }
        }
      });

      // Get completed sections for this user in this league
      const completedSections = await prisma.sectionProgress.count({
        where: {
          userId: userId,
          isCompleted: true,
          section: {
            week: {
              leagueId: leagueId
            }
          }
        }
      });

      // If all sections completed, award badge
      if (totalSections > 0 && completedSections >= totalSections) {
        // Check if badge exists for this league
        const badge = await prisma.badge.findFirst({
          where: { leagueId: leagueId }
        });

        if (badge) {
          // Check if user already has this badge
          const existingUserBadge = await prisma.userBadge.findFirst({
            where: {
              userId: userId,
              badgeId: badge.id
            }
          });

          if (!existingUserBadge) {
            // Award the badge
            await prisma.userBadge.create({
              data: {
                userId: userId,
                badgeId: badge.id
              }
            });

            // Create audit log
            await prisma.auditLog.create({
              data: {
                userId: userId,
                action: 'BADGE_EARNED',
                description: `Earned badge: ${badge.name} for completing all sections in league`,
                metadata: {
                  badgeId: badge.id,
                  leagueId: leagueId,
                  totalSections: totalSections
                }
              }
            });

            console.log(`🏆 Badge "${badge.name}" awarded to user ${userId} for completing league ${leagueId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking league completion:', error);
    }
  }
}
