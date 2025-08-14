import { Router } from 'express';
import { MigrationController } from '../controllers/migrationController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// All migration routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /migration/status
 * @desc Check if current user needs migration to V2
 * @access Private (authenticated users only)
 */
router.get('/status', MigrationController.getMigrationStatus);

/**
 * @route POST /migration/migrate-to-v2
 * @desc Migrate current user to V2 with enhanced profile data
 * @access Private (authenticated users only)
 * @body institute - University/College name (required)
 * @body department - Department/Field of study (optional)
 * @body graduationYear - Expected graduation year (optional)
 * @body phoneNumber - Contact number (optional)
 * @body studentId - College student ID (optional)
 * @body discordUsername - Discord username (optional)
 * @body portfolioUrl - Portfolio website URL (optional)
 */
router.post('/migrate-to-v2', MigrationController.migrateToV2);

export default router;
