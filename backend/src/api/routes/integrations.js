/**
 * Integration Routes
 * Endpoints for Jira & GitHub issue tracking configurations and 1-click issue sync.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireFeature } from '../../middleware/planGating.js';
import integrationController from '../controllers/integrationController.js';

const router = express.Router();

// Require authentication for all integration routes
router.use(authenticateToken);

// Integration Settings & Connection Tests
router.get('/configs', integrationController.getIntegrationConfigs);
router.post('/configs', requireFeature('jira_linear_sync', 'business'), integrationController.saveIntegrationConfig);
router.post('/test-connection', integrationController.testIntegrationConnection);

// Issue Creation & Status Synchronization
router.post('/issues/create', requireFeature('jira_linear_sync', 'business'), integrationController.createIssueFromTest);
router.get('/issues/linked', integrationController.getLinkedIssues);
router.post('/issues/:id/sync', requireFeature('jira_linear_sync', 'business'), integrationController.syncIssue);
router.delete('/issues/:id', integrationController.unlinkIssue);

export default router;
