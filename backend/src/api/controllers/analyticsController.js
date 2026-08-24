/**
 * Analytics Controller
 * Handles request dispatching for high-level QA analytics, performance trends, flakiness insights, and exports.
 */

import { analyticsService } from '../../services/analyticsService.js';
import logger from '../../utils/logger.js';

export const getOverview = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment } = req.query;
    const overview = await analyticsService.getOverview({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
    });
    res.json({ success: true, data: overview });
  } catch (error) {
    logger.error('analyticsController.getOverview error', { error: error.message });
    next(error);
  }
};

export const getPerformanceTrends = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment } = req.query;
    const trends = await analyticsService.getPerformanceTrends({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
    });
    res.json({ success: true, data: trends });
  } catch (error) {
    logger.error('analyticsController.getPerformanceTrends error', { error: error.message });
    next(error);
  }
};

export const getSlowestTests = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment, limit } = req.query;
    const tests = await analyticsService.getSlowestTests({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
      limit: parseInt(limit, 10) || 10,
    });
    res.json({ success: true, data: tests });
  } catch (error) {
    logger.error('analyticsController.getSlowestTests error', { error: error.message });
    next(error);
  }
};

export const getFlakinessInsights = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment } = req.query;
    const insights = await analyticsService.getFlakinessInsights({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
    });
    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error('analyticsController.getFlakinessInsights error', { error: error.message });
    next(error);
  }
};

export const getDistribution = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment } = req.query;
    const distribution = await analyticsService.getDistribution({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
    });
    res.json({ success: true, data: distribution });
  } catch (error) {
    logger.error('analyticsController.getDistribution error', { error: error.message });
    next(error);
  }
};

export const getSpecHealth = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment, search } = req.query;
    const specHealth = await analyticsService.getSpecHealth({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
      search,
    });
    res.json({ success: true, data: specHealth });
  } catch (error) {
    logger.error('analyticsController.getSpecHealth error', { error: error.message });
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { projectId, timeRange, environment, format } = req.query;
    const exportResult = await analyticsService.getExportData({
      projectId: projectId || req.projectId,
      timeRange,
      environment,
      format: format === 'csv' ? 'csv' : 'json',
    });

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    if (exportResult.contentType === 'text/csv') {
      res.send(exportResult.data);
    } else {
      res.json(exportResult.data);
    }
  } catch (error) {
    logger.error('analyticsController.exportReport error', { error: error.message });
    next(error);
  }
};

export default {
  getOverview,
  getPerformanceTrends,
  getSlowestTests,
  getFlakinessInsights,
  getDistribution,
  getSpecHealth,
  exportReport,
};
