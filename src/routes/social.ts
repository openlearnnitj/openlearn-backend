import { Router } from 'express';
import { SocialController } from '../controllers/socialController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/social/twitter/section/:sectionId
 * @desc Generate Twitter share link for section completion
 * @access All authenticated users
 */
router.get('/twitter/section/:sectionId', SocialController.generateTwitterShareLink);

/**
 * @route GET /api/social/linkedin/week/:weekId
 * @desc Generate LinkedIn share link for week completion
 * @access All authenticated users
 */
router.get('/linkedin/week/:weekId', SocialController.generateLinkedInShareLink);

/**
 * @route GET /api/social/:platform/:type/:id
 * @desc Generate share link for achievements (badges/specializations)
 * @access All authenticated users
 * @params platform - twitter | linkedin
 * @params type - badge | specialization
 * @params id - badge ID or specialization ID
 */
router.get('/:platform/:type/:id', SocialController.generateAchievementShareLink);

export default router;
