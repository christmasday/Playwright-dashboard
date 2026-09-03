/**
 * AI Root Cause & Fix Routes
 */

import express from 'express';
import {
  getProviders,
  fetchModels,
  testConnection,
  getTestAnalysis,
  analyzeTest,
  analyzeCluster,
} from '../controllers/aiController.js';
import { apiKeyAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(apiKeyAuth);

router.get('/providers', getProviders);
router.post('/fetch-models', fetchModels);
router.post('/test-connection', testConnection);
router.get('/tests/:testRunId/analysis', getTestAnalysis);
router.post('/tests/:testRunId/analysis', analyzeTest);
router.post('/clusters/analysis', analyzeCluster);

export default router;
