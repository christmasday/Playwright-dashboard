/**
 * Integration Routes
 * Endpoints for Jira & GitHub issue tracking configurations and 1-click issue sync.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import integrationController from '../controllers/integrationController.js';

const router = express.Router();

// Require authentication for all integration routes
router.use(authenticateToken);

// Integration Settings & Connection Tests
router.get('/configs', integrationController.getIntegrationConfigs);
router.post('/configs', integrationController.saveIntegrationConfig);
router.post('/test-connection', integrationController.testIntegrationConnection);

// Issue Creation & Status Synchronization
router.post('/issues/create', integrationController.createIssueFromTest);
router.get('/issues/linked', integrationController.getLinkedIssues);
router.post('/issues/:id/sync', integrationController.syncIssue);
router.delete('/issues/:id', integrationController.unlinkIssue);

export default router;
