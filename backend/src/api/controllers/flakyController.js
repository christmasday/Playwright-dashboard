/**
 * Flaky Analysis Controller
 */

import { flakyAnalysisEngine } from '../../services/flakyAnalysisEngine.js';
import logger from '../../utils/logger.js';

export const getFlakySummary = async (req, res, next) => {
  try {
    const summary = await flakyAnalysisEngine.getSummary();
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};

export const getFlakyTests = async (req, res, next) => {
  try {
    const { status, severity, search, limit = 10, offset = 0, page } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedOffset = page
      ? (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit
      : (parseInt(offset, 10) || 0);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    const { tests, total } = await flakyAnalysisEngine.getFlakyTests({
      status,
      severity,
      search,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    res.json({
      success: true,
      count: tests.length,
      total,
      page: currentPage,
      limit: parsedLimit,
      totalPages,
      tests,
    });
  } catch (error) {
    next(error);
  }
};

export const runAnalysisScan = async (req, res, next) => {
  try {
    const result = await flakyAnalysisEngine.analyzeHistoricalRuns();
    const summary = await flakyAnalysisEngine.getSummary();
    res.json({
      success: true,
      message: `Analysis engine scanned historical runs successfully. Analyzed ${result.analyzedCount} test entries.`,
      analyzedCount: result.analyzedCount,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuarantine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quarantineStatus, notes } = req.body;
    const userEmail = req.user ? req.user.email : 'admin';

    if (!quarantineStatus || !['active', 'quarantined', 'resolved'].includes(quarantineStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid quarantineStatus. Must be active, quarantined, or resolved.' });
    }

    const updated = await flakyAnalysisEngine.updateQuarantine(id, { quarantineStatus, notes, userEmail });
    res.json({ success: true, flakyTest: updated });
  } catch (error) {
    next(error);
  }
};

export const getFlakyHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await flakyAnalysisEngine.getHistory(id);
    res.json({ success: true, ...history });
  } catch (error) {
    next(error);
  }
};

export default {
  getFlakySummary,
  getFlakyTests,
  runAnalysisScan,
  updateQuarantine,
  getFlakyHistory,
};
