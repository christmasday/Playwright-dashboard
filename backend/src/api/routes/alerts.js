/**
 * Alert Routes
 * Endpoints for managing Slack, Teams, and Discord alert destinations.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import alertController from '../controllers/alertController.js';

const router = express.Router();

// Require authentication for all alert management routes
router.use(authenticateToken);

// Destination CRUD
router.get('/', alertController.listAlertDestinations);
router.post('/', alertController.createAlertDestination);
router.get('/logs', alertController.getDeliveryLogs);
router.post('/test', alertController.testAlertDestination);

router.get('/:id', alertController.getAlertDestination);
router.patch('/:id', alertController.updateAlertDestination);
router.delete('/:id', alertController.deleteAlertDestination);
router.post('/:id/test', (req, res, next) => {
  req.body = { ...req.body, destinationId: req.params.id };
  return alertController.testAlertDestination(req, res, next);
});

export default router;
