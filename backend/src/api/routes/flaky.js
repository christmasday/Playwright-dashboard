/**
 * Flaky Test Analysis Routes
 */

import express from 'express';
import {
  getFlakySummary,
  getFlakyTests,
  runAnalysisScan,
  updateQuarantine,
  getFlakyHistory,
} from '../controllers/flakyController.js';
import { apiKeyAuth } from '../middleware/auth.js';
import { requireFeature } from '../../middleware/planGating.js';

const router = express.Router();

// Apply auth middleware if API key or auth token present
router.use(apiKeyAuth);

router.get('/summary', getFlakySummary);
router.get('/', getFlakyTests);
router.post('/analyze', runAnalysisScan);
router.patch('/:id/quarantine', requireFeature('flaky_quarantine', 'business'), updateQuarantine);
router.get('/:id/history', getFlakyHistory);

export default router;
