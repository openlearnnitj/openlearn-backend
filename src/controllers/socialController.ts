import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';

export class SocialController {
  /**
   * Generate Twitter share link for section completion
   */
  static async generateTwitterShareLink(req: Request, res: Response): Promise<void> {
    try {
      const { sectionId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Get section details with progress
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          week: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          progress: {
            where: { 
              userId: currentUser.userId,
              isCompleted: true 
            }
          }
        }
      });

      if (!section) {
        res.status(404).json({
          success: false,
          error: 'Section not found',
        });
        return;
      }

      // Check if user has completed this section
      if (section.progress.length === 0) {
        res.status(400).json({
          success: false,
          error: 'You must complete this section before sharing',
        });
        return;
      }

      // Generate share text
      const shareText = `🚀 Just completed "${section.name}" in ${section.week.league.name} league on @OpenLearnPlatform! 

Making progress in my learning journey 📚

#OpenLearn #Learning #${section.week.league.name.replace(/[^a-zA-Z]/g, '')}`;

      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

      res.status(200).json({
        success: true,
        data: {
          shareUrl: twitterUrl,
          shareText,
          section: {
            id: section.id,
            name: section.name,
            league: section.week.league.name
          }
        },
        message: 'Twitter share link generated successfully',
      });
    } catch (error) {
      console.error('Generate Twitter share link error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Generate LinkedIn share link for week completion
   */
  static async generateLinkedInShareLink(req: Request, res: Response): Promise<void> {
    try {
      const { weekId } = req.params;
      const currentUser = req.user as TokenPayload;

      // Get week details with sections and progress
      const week = await prisma.week.findUnique({
        where: { id: weekId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            }
          },
          sections: {
            include: {
              progress: {
                where: { 
                  userId: currentUser.userId,
                  isCompleted: true 
                }
              }
            }
          }
        }
      });

      if (!week) {
        res.status(404).json({
          success: false,
          error: 'Week not found',
        });
        return;
      }

      // Check if user has completed all sections in this week
      const totalSections = week.sections.length;
      const completedSections = week.sections.filter(section => section.progress.length > 0).length;

      if (completedSections < totalSections) {
        res.status(400).json({
          success: false,
          error: 'You must complete all sections in this week before sharing',
        });
        return;
      }

      // Generate share text
      const shareText = `🎉 Completed ${week.name} in ${week.league.name} league on OpenLearn!

Learned so much in this week covering ${totalSections} comprehensive sections. Excited to continue my learning journey!

#OpenLearn #ProfessionalDevelopment #${week.league.name.replace(/[^a-zA-Z]/g, '')} #Learning`;

      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://openlearn.platform')}&summary=${encodeURIComponent(shareText)}`;

      res.status(200).json({
        success: true,
        data: {
          shareUrl: linkedinUrl,
          shareText,
          week: {
            id: week.id,
            name: week.name,
            league: week.league.name,
            completedSections,
            totalSections
          }
        },
        message: 'LinkedIn share link generated successfully',
      });
    } catch (error) {
      console.error('Generate LinkedIn share link error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Generate generic share link for achievements
   */
  static async generateAchievementShareLink(req: Request, res: Response): Promise<void> {
    try {
      const { type, id } = req.params; // type: 'badge' | 'specialization'
      const { platform } = req.query; // 'twitter' | 'linkedin'
      const currentUser = req.user as TokenPayload;

      let shareData: any = {};

      if (type === 'badge') {
        // Get badge details
        const userBadge = await prisma.userBadge.findFirst({
          where: {
            userId: currentUser.userId,
            badgeId: id
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
            }
          }
        });

        if (!userBadge) {
          res.status(404).json({
            success: false,
            error: 'Badge not found or not earned by user',
          });
          return;
        }

        shareData = {
          type: 'badge',
          title: userBadge.badge.name,
          league: userBadge.badge.league.name,
          shareText: `🏆 Just earned the "${userBadge.badge.name}" badge for completing ${userBadge.badge.league.name} league on OpenLearn!

Proud of this achievement! 💪

#OpenLearn #Achievement #${userBadge.badge.league.name.replace(/[^a-zA-Z]/g, '')}`
        };
      } else if (type === 'specialization') {
        // Get specialization details
        const userSpec = await prisma.userSpecialization.findFirst({
          where: {
            userId: currentUser.userId,
            specializationId: id
          },
          include: {
            specialization: {
              select: {
                name: true,
                description: true
              }
            }
          }
        });

        if (!userSpec) {
          res.status(404).json({
            success: false,
            error: 'Specialization not found or not completed by user',
          });
          return;
        }

        shareData = {
          type: 'specialization',
          title: userSpec.specialization.name,
          shareText: `🎓 Just completed the "${userSpec.specialization.name}" specialization on OpenLearn!

This comprehensive program has equipped me with valuable skills and knowledge. Ready for the next challenge!

#OpenLearn #Specialization #ProfessionalGrowth`
        };
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid share type. Use "badge" or "specialization"',
        });
        return;
      }

      // Generate platform-specific URLs
      let shareUrl: string;
      if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.shareText)}`;
      } else if (platform === 'linkedin') {
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://openlearn.platform')}&summary=${encodeURIComponent(shareData.shareText)}`;
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid platform. Use "twitter" or "linkedin"',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          shareUrl,
          shareText: shareData.shareText,
          achievement: shareData,
          platform
        },
        message: `${platform} share link generated successfully`,
      });
    } catch (error) {
      console.error('Generate achievement share link error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
