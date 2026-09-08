/**
 * Storage & Retention API Controller
 */

import storageRetentionService from '../../services/storageRetentionService.js';
import { StoragePolicy } from '../../models/storageRetention.js';
import logger from '../../utils/logger.js';

export const getPolicy = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const result = await storageRetentionService.getEffectivePolicy(projectId || null);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching storage retention policy', { error: error.message });
    next(error);
  }
};

export const savePolicy = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const updated = await storageRetentionService.savePolicy(projectId || null, req.body);

    res.json({
      success: true,
      message: 'Storage retention policy saved successfully',
      data: updated,
    });
  } catch (error) {
    logger.error('Error saving storage retention policy', { error: error.message });
    res.status(400).json({ error: error.message });
  }
};

export const testByos = async (req, res, next) => {
  try {
    const result = await storageRetentionService.testByosConnection(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error testing BYOS connection', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
};

export const runCleanup = async (req, res, next) => {
  try {
    const { dryRun, projectId } = req.body;
    const result = await storageRetentionService.runRetentionCleanup({
      dryRun: Boolean(dryRun),
      projectId: projectId || null,
    });

    res.json({
      success: true,
      message: dryRun
        ? 'Dry-run retention cleanup evaluated successfully'
        : 'Storage retention cleanup executed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error running storage retention cleanup', { error: error.message });
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const stats = await StoragePolicy.getStorageUsageStats(projectId || null);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching storage stats', { error: error.message });
    next(error);
  }
};

export default {
  getPolicy,
  savePolicy,
  testByos,
  runCleanup,
  getStats,
};
