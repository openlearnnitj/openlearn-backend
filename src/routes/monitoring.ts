import express from 'express';
import { monitoringHealthStatusHandler } from '../controllers/monitoringController';
import { monitoringSecretMiddleware } from '../middleware/monitoringSecret';

const router = express.Router();

// No rate limiting middleware here
router.get('/health-status', monitoringSecretMiddleware, monitoringHealthStatusHandler);

export default router;
