/**
 * Test Routes
 */

import express from 'express';
import testController from '../controllers/testController.js';
import { apiKeyAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware
router.use(apiKeyAuth);

// Endpoints
router.post('/ingest', testController.ingestTestResults);
router.get('/details/:testRunId', testController.getTestDetails);
router.get('/build/:buildId/summary', testController.getBuildSummary);
router.get('/flaky', testController.getFlakyTests);
router.patch('/:testRunId/status', testController.updateTestStatus);
router.get('/by-status', testController.getTestsByStatus);
router.get('/artifact-file', testController.getArtifactFile);

export default router;
