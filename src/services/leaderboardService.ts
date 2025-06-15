import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LeaderboardUser {
  rank: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    twitterHandle?: string | null;
    linkedinUrl?: string | null;
    githubUsername?: string | null;
    kaggleUsername?: string | null;
  };
  stats: {
    resourcesCompleted: number;
    totalResources: number;
    completionPercentage: number;
    badgesEarned: number;
    enrolledCohorts: number;
  };
  recentActivity: {
    lastCompletedResource?: {
      name: string;
      completedAt: Date;
    };
    lastBadgeEarned?: {
      name: string;
      earnedAt: Date;
    };
  };
}

export interface UserRankInfo extends LeaderboardUser {
  isCurrentUser: boolean;
  nearbyUsers: {
    above?: Partial<LeaderboardUser>;
    below?: Partial<LeaderboardUser>;
  };
}

export interface LeaderboardFilters {
  specializationId?: string;
  leagueId?: string;
  limit: number;
}

export class LeaderboardService {
  /**
   * Get top 10 users based on resources completed
   */
  static async getTopUsersByResourcesCompleted(limit: number = 10): Promise<LeaderboardUser[]> {
    try {
      // First, get the total number of available resources in the system
      const totalAvailableResources = await prisma.sectionResource.count();

      // Get users with their resource completion stats
      const usersWithStats = await prisma.user.findMany({
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          twitterHandle: true,
          linkedinUrl: true,
          githubUsername: true,
          kaggleUsername: true,
          resourceProgress: {
            where: {
              isCompleted: true
            },
            select: {
              id: true,
              completedAt: true,
              resource: {
                select: {
                  title: true
                }
              }
            },
            orderBy: {
              completedAt: 'desc'
            }
          },
          badges: {
            select: {
              id: true,
              earnedAt: true,
              badge: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              earnedAt: 'desc'
            }
          },
          enrollments: {
            select: {
              id: true
            }
          }
        }
      });

      // Calculate stats and sort by resources completed
      const leaderboardData = usersWithStats
        .map(user => {
          const resourcesCompleted = user.resourceProgress.length;
          const totalResources = totalAvailableResources; // Use actual total available resources
          const completionPercentage = totalResources > 0 
            ? Math.round((resourcesCompleted / totalResources) * 100) 
            : 0;

          const lastCompletedResource = user.resourceProgress[0] || null;
          const lastBadgeEarned = user.badges[0] || null;

          return {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              twitterHandle: user.twitterHandle,
              linkedinUrl: user.linkedinUrl,
              githubUsername: user.githubUsername,
              kaggleUsername: user.kaggleUsername,
            },
            stats: {
              resourcesCompleted,
              totalResources,
              completionPercentage,
              badgesEarned: user.badges.length,
              enrolledCohorts: user.enrollments.length,
            },
            recentActivity: {
              lastCompletedResource: lastCompletedResource ? {
                name: lastCompletedResource.resource.title,
                completedAt: lastCompletedResource.completedAt!
              } : undefined,
              lastBadgeEarned: lastBadgeEarned ? {
                name: lastBadgeEarned.badge.name,
                earnedAt: lastBadgeEarned.earnedAt!
              } : undefined,
            }
          };
        })
        .sort((a, b) => {
          // Primary sort: resources completed (descending)
          if (b.stats.resourcesCompleted !== a.stats.resourcesCompleted) {
            return b.stats.resourcesCompleted - a.stats.resourcesCompleted;
          }
          // Secondary sort: completion percentage (descending)
          if (b.stats.completionPercentage !== a.stats.completionPercentage) {
            return b.stats.completionPercentage - a.stats.completionPercentage;
          }
          // Tertiary sort: badges earned (descending)
          return b.stats.badgesEarned - a.stats.badgesEarned;
        })
        .slice(0, limit)
        .map((user, index) => ({
          rank: index + 1,
          ...user
        }));

      return leaderboardData;
    } catch (error) {
      console.error('Error in getTopUsersByResourcesCompleted:', error);
      throw new Error('Failed to fetch leaderboard data');
    }
  }

  /**
   * Get specific user's rank and nearby users
   */
  static async getUserRank(userId: string): Promise<UserRankInfo> {
    try {
      // Get all users sorted by performance
      const allUsers = await this.getTopUsersByResourcesCompleted(1000); // Get many users to find rank
      
      const userIndex = allUsers.findIndex(user => user.user.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found in leaderboard');
      }

      const currentUser = allUsers[userIndex];
      const nearbyUsers = {
        above: userIndex > 0 ? {
          rank: allUsers[userIndex - 1].rank,
          user: allUsers[userIndex - 1].user,
          stats: allUsers[userIndex - 1].stats
        } : undefined,
        below: userIndex < allUsers.length - 1 ? {
          rank: allUsers[userIndex + 1].rank,
          user: allUsers[userIndex + 1].user,
          stats: allUsers[userIndex + 1].stats
        } : undefined
      };

      return {
        ...currentUser,
        isCurrentUser: true,
        nearbyUsers
      };
    } catch (error) {
      console.error('Error in getUserRank:', error);
      throw new Error('Failed to fetch user rank');
    }
  }

  /**
   * Get filtered leaderboard based on specialization, league, etc.
   */
  static async getFilteredLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardUser[]> {
    try {
      // First, get the total number of available resources in the system
      const totalAvailableResources = await prisma.sectionResource.count();

      const whereClause: any = {
        status: 'ACTIVE'
      };

      // Add specialization filter
      if (filters.specializationId) {
        whereClause.enrollments = {
          some: {
            cohort: {
              specialization: {
                id: filters.specializationId
              }
            }
          }
        };
      }

      // Add league filter  
      if (filters.leagueId) {
        whereClause.enrollments = {
          some: {
            cohort: {
              league: {
                id: filters.leagueId
              }
            }
          }
        };
      }

      const usersWithStats = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          twitterHandle: true,
          linkedinUrl: true,
          githubUsername: true,
          kaggleUsername: true,
          resourceProgress: {
            where: {
              isCompleted: true
            },
            select: {
              id: true,
              completedAt: true,
              resource: {
                select: {
                  title: true
                }
              }
            },
            orderBy: {
              completedAt: 'desc'
            }
          },
          badges: {
            select: {
              id: true,
              earnedAt: true,
              badge: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              earnedAt: 'desc'
            }
          },
          enrollments: {
            select: {
              id: true
            }
          }
        }
      });

      // Process and sort the data similar to getTopUsersByResourcesCompleted
      const leaderboardData = usersWithStats
        .map(user => {
          const resourcesCompleted = user.resourceProgress.length;
          const totalResources = totalAvailableResources; // Use actual total available resources
          const completionPercentage = totalResources > 0 
            ? Math.round((resourcesCompleted / totalResources) * 100) 
            : 0;

          const lastCompletedResource = user.resourceProgress[0] || null;
          const lastBadgeEarned = user.badges[0] || null;

          return {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              twitterHandle: user.twitterHandle,
              linkedinUrl: user.linkedinUrl,
              githubUsername: user.githubUsername,
              kaggleUsername: user.kaggleUsername,
            },
            stats: {
              resourcesCompleted,
              totalResources,
              completionPercentage,
              badgesEarned: user.badges.length,
              enrolledCohorts: user.enrollments.length,
            },
            recentActivity: {
              lastCompletedResource: lastCompletedResource ? {
                name: lastCompletedResource.resource.title,
                completedAt: lastCompletedResource.completedAt!
              } : undefined,
              lastBadgeEarned: lastBadgeEarned ? {
                name: lastBadgeEarned.badge.name,
                earnedAt: lastBadgeEarned.earnedAt!
              } : undefined,
            }
          };
        })
        .sort((a, b) => {
          if (b.stats.resourcesCompleted !== a.stats.resourcesCompleted) {
            return b.stats.resourcesCompleted - a.stats.resourcesCompleted;
          }
          if (b.stats.completionPercentage !== a.stats.completionPercentage) {
            return b.stats.completionPercentage - a.stats.completionPercentage;
          }
          return b.stats.badgesEarned - a.stats.badgesEarned;
        })
        .slice(0, filters.limit)
        .map((user, index) => ({
          rank: index + 1,
          ...user
        }));

      return leaderboardData;
    } catch (error) {
      console.error('Error in getFilteredLeaderboard:', error);
      throw new Error('Failed to fetch filtered leaderboard');
    }
  }
}
