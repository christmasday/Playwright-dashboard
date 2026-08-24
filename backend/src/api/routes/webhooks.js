import express from 'express';
import webhookController from '../controllers/webhookController.js';
import { validateWebhookSignature, extractWebhookData } from '../../middleware/webhookValidation.js';

const router = express.Router();

router.post('/github', validateWebhookSignature('github'), extractWebhookData('github'), webhookController.handleGitHubWebhook);
router.post('/gitlab', validateWebhookSignature('gitlab'), extractWebhookData('gitlab'), webhookController.handleGitLabWebhook);
router.post('/jenkins', validateWebhookSignature('jenkins'), extractWebhookData('jenkins'), webhookController.handleJenkinsWebhook);

router.get('/status', webhookController.getStatus);

export default router;
