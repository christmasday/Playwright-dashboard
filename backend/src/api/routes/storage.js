/**
 * Storage Retention & BYOS Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import storageController from '../controllers/storageController.js';

const router = express.Router();

// Require authentication for storage policy operations
router.use(authenticateToken);

// Retention Policies & Presets
router.get('/policy', storageController.getPolicy);
router.put('/policy', storageController.savePolicy);

// Storage Metrics & Stats
router.get('/stats', storageController.getStats);

// BYOS Connection Verification
router.post('/test-byos', storageController.testByos);

// Lifecycle Cleanup Execution
router.post('/cleanup', storageController.runCleanup);

export default router;
