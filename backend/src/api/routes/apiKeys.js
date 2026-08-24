/**
 * API Key Routes
 * Self-service management of the authenticated user's API keys.
 */
import express from 'express';
import apiKeyController from '../controllers/apiKeyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All key operations are scoped to the authenticated user.
router.use(authenticateToken);

router.get('/', apiKeyController.listKeys);
router.post('/', apiKeyController.createKey);
router.delete('/:id', apiKeyController.revokeKey);

export default router;
