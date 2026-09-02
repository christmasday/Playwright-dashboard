/**
 * Build Routes
 */

import express from 'express';
import buildController from '../controllers/buildController.js';
import { authenticateToken, apiKeyAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware
router.use(apiKeyAuth);

// Public endpoints
router.post('/', buildController.createBuild);
router.get('/', buildController.listBuilds);
router.get('/compare', buildController.compareBuilds);
router.get('/:buildId', buildController.getBuild);
router.patch('/:buildId', buildController.updateBuild);
router.get('/:buildId/metrics', buildController.getBuildMetrics);

export default router;
