/**
 * Analytics Routes
 */

import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { apiKeyAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware (supports JWT Bearer and API Key)
router.use(apiKeyAuth);

router.get('/overview', analyticsController.getOverview);
router.get('/performance-trends', analyticsController.getPerformanceTrends);
router.get('/slowest-tests', analyticsController.getSlowestTests);
router.get('/flakiness-insights', analyticsController.getFlakinessInsights);
router.get('/distribution', analyticsController.getDistribution);
router.get('/spec-health', analyticsController.getSpecHealth);
router.get('/export', analyticsController.exportReport);

export default router;
