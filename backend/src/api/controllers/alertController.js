/**
 * Alert Controller
 * Handles Slack, Teams, and Discord webhook configurations and live testing.
 */

import { AlertDestination } from '../../models/alertDestination.js';
import alertService from '../../services/alertService.js';
import logger from '../../utils/logger.js';

const VALID_PROVIDERS = ['slack', 'teams', 'discord', 'webhook'];
const VALID_EVENTS = ['all', 'failures_only', 'status_change'];

export const listAlertDestinations = async (req, res, next) => {
  try {
    const { projectId, provider, enabled } = req.query;
    const destinations = await AlertDestination.list({
      projectId: projectId || undefined,
      provider: provider || undefined,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });

    res.json({
      success: true,
      count: destinations.length,
      data: destinations,
    });
  } catch (error) {
    logger.error('Error listing alert destinations', { error: error.message });
    next(error);
  }
};

export const getAlertDestination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const destination = await AlertDestination.findById(id);

    if (!destination) {
      return res.status(404).json({ error: 'Alert destination not found' });
    }

    res.json({
      success: true,
      data: destination,
    });
  } catch (error) {
    logger.error('Error getting alert destination', { id: req.params.id, error: error.message });
    next(error);
  }
};

export const createAlertDestination = async (req, res, next) => {
  try {
    const {
      name,
      provider,
      webhookUrl,
      projectId,
      events = 'failures_only',
      branches = '*',
      includeAiSummary = true,
      enabled = true,
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Destination name is required' });
    }

    if (!provider || !VALID_PROVIDERS.includes(provider.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      });
    }

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return res.status(400).json({
        error: 'Valid HTTP/HTTPS webhook URL is required',
      });
    }

    if (events && !VALID_EVENTS.includes(events)) {
      return res.status(400).json({
        error: `Invalid event trigger. Must be one of: ${VALID_EVENTS.join(', ')}`,
      });
    }

    const destination = await AlertDestination.create({
      name: name.trim(),
      provider: provider.toLowerCase(),
      webhookUrl: webhookUrl.trim(),
      projectId: projectId || null,
      events,
      branches: branches ? branches.trim() : '*',
      includeAiSummary: Boolean(includeAiSummary),
      enabled: Boolean(enabled),
      createdBy: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Alert destination created successfully',
      data: destination,
    });
  } catch (error) {
    logger.error('Error creating alert destination', { error: error.message });
    next(error);
  }
};

export const updateAlertDestination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await AlertDestination.findById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Alert destination not found' });
    }

    const {
      name,
      provider,
      webhookUrl,
      projectId,
      events,
      branches,
      includeAiSummary,
      enabled,
    } = req.body;

    if (provider && !VALID_PROVIDERS.includes(provider.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      });
    }

    if (webhookUrl && !webhookUrl.startsWith('http')) {
      return res.status(400).json({
        error: 'Valid HTTP/HTTPS webhook URL is required',
      });
    }

    if (events && !VALID_EVENTS.includes(events)) {
      return res.status(400).json({
        error: `Invalid event trigger. Must be one of: ${VALID_EVENTS.join(', ')}`,
      });
    }

    const updated = await AlertDestination.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      provider: provider !== undefined ? provider.toLowerCase() : undefined,
      webhookUrl: webhookUrl !== undefined ? webhookUrl.trim() : undefined,
      projectId: projectId !== undefined ? projectId || null : undefined,
      events,
      branches: branches !== undefined ? branches.trim() : undefined,
      includeAiSummary,
      enabled,
    });

    res.json({
      success: true,
      message: 'Alert destination updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating alert destination', { id: req.params.id, error: error.message });
    next(error);
  }
};

export const deleteAlertDestination = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await AlertDestination.findById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Alert destination not found' });
    }

    await AlertDestination.delete(id);

    res.json({
      success: true,
      message: 'Alert destination deleted successfully',
      data: existing,
    });
  } catch (error) {
    logger.error('Error deleting alert destination', { id: req.params.id, error: error.message });
    next(error);
  }
};

export const testAlertDestination = async (req, res, next) => {
  try {
    let { provider, webhookUrl, destinationId } = req.body;

    // If destinationId is provided, pull stored webhook details
    if (destinationId) {
      const destination = await AlertDestination.findById(destinationId);
      if (!destination) {
        return res.status(404).json({ error: 'Alert destination not found' });
      }
      provider = destination.provider;
      webhookUrl = destination.webhook_url;
    }

    if (!provider || !webhookUrl) {
      return res.status(400).json({ error: 'provider and webhookUrl are required for test' });
    }

    const result = await alertService.sendTestAlert({
      provider: provider.toLowerCase(),
      webhookUrl,
      destinationId: destinationId || null,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        error: result.error || 'Failed to dispatch test notification to webhook',
      });
    }

    res.json({
      success: true,
      message: `Test notification successfully delivered to ${provider.toUpperCase()}`,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    logger.error('Error sending test alert', { error: error.message });
    next(error);
  }
};

export const getDeliveryLogs = async (req, res, next) => {
  try {
    const { destinationId, buildId, limit = 50 } = req.query;
    const logs = await AlertDestination.getDeliveryLogs({
      destinationId: destinationId || undefined,
      buildId: buildId || undefined,
      limit: Math.min(100, parseInt(limit, 10) || 50),
    });

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    logger.error('Error getting alert delivery logs', { error: error.message });
    next(error);
  }
};

export default {
  listAlertDestinations,
  getAlertDestination,
  createAlertDestination,
  updateAlertDestination,
  deleteAlertDestination,
  testAlertDestination,
  getDeliveryLogs,
};
