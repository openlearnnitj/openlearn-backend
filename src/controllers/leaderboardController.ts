import { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboardService';

export class LeaderboardController {
  /**
   * Get top 10 users based on resources completed
   * GET /api/leaderboard
   */
  static async getResourceLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const leaderboard = await LeaderboardService.getTopUsersByResourcesCompleted();

      res.status(200).json({
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: {
          leaderboard,
          totalUsers: leaderboard.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Get current user's rank in the leaderboard
   * GET /api/leaderboard/my-rank
   */
  static async getCurrentUserRank(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const userRank = await LeaderboardService.getUserRank(userId);

      res.status(200).json({
        success: true,
        message: 'User rank retrieved successfully',
        data: userRank
      });
    } catch (error) {
      console.error('Error fetching user rank:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user rank',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  /**
   * Get leaderboard with additional filters
   * GET /api/leaderboard/filtered?specialization=ai&league=beginner&limit=20
   */
  static async getFilteredLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { specialization, league, limit = 10 } = req.query;
      
      const filters = {
        specializationId: specialization as string,
        leagueId: league as string,
        limit: Math.min(parseInt(limit as string) || 10, 50) // Max 50 users
      };

      const leaderboard = await LeaderboardService.getFilteredLeaderboard(filters);

      res.status(200).json({
        success: true,
        message: 'Filtered leaderboard retrieved successfully',
        data: {
          leaderboard,
          filters: {
            specialization: filters.specializationId || 'all',
            league: filters.leagueId || 'all',
            limit: filters.limit
          },
          totalUsers: leaderboard.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching filtered leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch filtered leaderboard',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}
