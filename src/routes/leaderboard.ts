import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboardController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/leaderboard
 * @desc    Get top 10 users based on resources completed
 * @access  Private (any authenticated user)
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  LeaderboardController.getResourceLeaderboard
);

/**
 * @route   GET /api/leaderboard/my-rank
 * @desc    Get current user's rank in the leaderboard
 * @access  Private (authenticated user)
 */
router.get(
  '/my-rank',
  AuthMiddleware.authenticate,
  LeaderboardController.getCurrentUserRank
);

/**
 * @route   GET /api/leaderboard/filtered
 * @desc    Get leaderboard with filters (specialization, league, limit)
 * @access  Private (any authenticated user)
 * @query   ?specialization=ai&league=beginner&limit=20
 */
router.get(
  '/filtered',
  AuthMiddleware.authenticate,
  LeaderboardController.getFilteredLeaderboard
);

export default router;
