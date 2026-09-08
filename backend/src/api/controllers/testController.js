/**
 * Test Controller
 * Handles test-related API requests
 */

import fs from 'fs';
import path from 'path';
import testService from '../../services/testService.js';
import { Build, TestRun, TestResult } from '../../models/index.js';
import logger from '../../utils/logger.js';

export const ingestTestResults = async (req, res, next) => {
  try {
    const { buildId, results } = req.body;

    if (!buildId || !results) {
      return res.status(400).json({ error: 'buildId and results are required' });
    }

    // Verify build exists
    const build = await Build.findById(buildId);
    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }

    // Ingest results
    const testRuns = await testService.ingestTestResults(buildId, results);

    res.status(201).json({
      success: true,
      buildId,
      testRunsCount: testRuns.length,
      message: 'Test results ingested successfully',
    });
  } catch (error) {
    logger.error('Error ingesting test results', { error: error.message });
    next(error);
  }
};

export const getTestDetails = async (req, res, next) => {
  try {
    const { testRunId } = req.params;

    if (!testRunId) {
      return res.status(400).json({ error: 'testRunId is required' });
    }

    const testDetails = await testService.getTestDetails(testRunId);

    res.json(testDetails);
  } catch (error) {
    logger.error('Error getting test details', { error: error.message });
    next(error);
  }
};

export const getBuildSummary = async (req, res, next) => {
  try {
    const { buildId } = req.params;

    if (!buildId) {
      return res.status(400).json({ error: 'buildId is required' });
    }

    const summary = await testService.getBuildSummary(buildId);

    res.json(summary);
  } catch (error) {
    logger.error('Error getting build summary', { error: error.message });
    next(error);
  }
};

export const getFlakyTests = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const flakyTests = await testService.getFlakyTests(null, parseInt(limit));

    res.json({
      count: flakyTests.length,
      tests: flakyTests,
    });
  } catch (error) {
    logger.error('Error getting flaky tests', { error: error.message });
    next(error);
  }
};

export const updateTestStatus = async (req, res, next) => {
  try {
    const { testRunId } = req.params;
    const { status, quarantineReason } = req.body;

    if (!testRunId) {
      return res.status(400).json({ error: 'testRunId is required' });
    }
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const existing = await TestRun.findById(testRunId);
    if (!existing) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    const updates = { status };
    if (quarantineReason !== undefined) updates.quarantine_reason = quarantineReason;
    updates.quarantined = status === 'quarantined';

    const updated = await TestRun.update(testRunId, updates);
    res.json(updated);
  } catch (error) {
    logger.error('Error updating test status', { error: error.message });
    next(error);
  }
};

export const getTestsByStatus = async (req, res, next) => {
  try {
    const { buildId, status = 'all', limit = 500 } = req.query;

    if (!buildId) {
      return res.status(400).json({ error: 'buildId is required' });
    }

    const testRuns = await TestRun.findByBuildId(buildId, parseInt(limit));
    const filtered = (!status || status === 'all')
      ? testRuns
      : testRuns.filter((t) => t.status === status);

    // Fetch step failures for failed test runs so we have full error context for clustering
    const failedRuns = filtered.filter((t) => t.status === 'failed' || t.status === 'flaky');
    if (failedRuns.length > 0) {
      const stepResults = await Promise.all(
        failedRuns.map(async (run) => {
          const rawSteps = await TestResult.findByTestRunId(run.id).catch(() => []);
          const failedStep = (rawSteps || []).find((s) => s.status === 'failed' && s.error);
          return {
            id: run.id,
            error: run.error || (failedStep ? failedStep.error : null),
            errorLocation: failedStep ? (failedStep.error_location || failedStep.errorLocation) : null,
            stackTrace:
              run.stack_trace ||
              run.stackTrace ||
              (failedStep
                ? failedStep.error_location
                  ? `${failedStep.error}\n    at ${failedStep.error_location}`
                  : failedStep.error
                : null),
            steps: rawSteps,
          };
        })
      );
      const stepMap = new Map(stepResults.map((s) => [s.id, s]));
      for (const run of filtered) {
        const extra = stepMap.get(run.id);
        if (extra) {
          run.error = extra.error || run.error;
          run.errorLocation = extra.errorLocation || run.errorLocation;
          run.stackTrace = extra.stackTrace || run.stackTrace;
          run.steps = extra.steps || run.steps;
        }
      }
    }

    res.json({
      status,
      count: filtered.length,
      tests: filtered,
      data: filtered,
    });
  } catch (error) {
    logger.error('Error getting tests by status', { error: error.message });
    next(error);
  }
};

export const getArtifactFile = async (req, res, next) => {
  try {
    const targetPath = req.query.path || req.query.filePath;

    if (!targetPath) {
      return res.status(400).json({ error: 'path parameter is required' });
    }

    let resolved = path.resolve(String(targetPath));

    // Fallback: If not found directly, check uploads/artifacts or test-results
    if (!fs.existsSync(resolved)) {
      const baseName = path.basename(String(targetPath));
      const uploadsCandidate = path.resolve(process.cwd(), 'uploads/artifacts', baseName);
      if (fs.existsSync(uploadsCandidate)) {
        resolved = uploadsCandidate;
      } else {
        // Search recursively in uploads/artifacts if file exists
        const artifactsDir = path.resolve(process.cwd(), 'uploads/artifacts');
        if (fs.existsSync(artifactsDir)) {
          const findInDir = (dir) => {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
              const full = path.join(dir, file.name);
              if (file.isDirectory()) {
                const found = findInDir(full);
                if (found) return found;
              } else if (file.name === baseName) {
                return full;
              }
            }
            return null;
          };
          const match = findInDir(artifactsDir);
          if (match) {
            resolved = match;
          }
        }
      }
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Artifact file not found on disk' });
    }

    const stat = fs.statSync(resolved);
    const fileSize = stat.size;
    const ext = path.extname(resolved).toLowerCase();

    let contentType = 'application/octet-stream';
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    } else if (['.webm', '.mp4', '.ogg'].includes(ext)) {
      contentType = ext === '.webm' ? 'video/webm' : ext === '.mp4' ? 'video/mp4' : 'video/ogg';
    } else if (['.zip'].includes(ext)) {
      contentType = 'application/zip';
    } else if (['.txt', '.log', '.json', '.xml', '.md'].includes(ext)) {
      contentType = ext === '.json' ? 'application/json' : ext === '.xml' ? 'application/xml' : 'text/plain';
    }

    // Common media headers for modern browsers
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Handle HTTP Range requests for video playback and audio streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', contentType);

      const stream = fs.createReadStream(resolved, { start, end });
      stream.on('error', (err) => {
        logger.error('Stream read error during range request', { error: err.message });
        if (!res.headersSent) res.status(500).end();
      });
      return stream.pipe(res);
    }

    // Standard whole-file response
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', contentType);
    const stream = fs.createReadStream(resolved);
    stream.on('error', (err) => {
      logger.error('Stream read error during artifact delivery', { error: err.message });
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (error) {
    logger.error('Error serving artifact file', { error: error.message });
    next(error);
  }
};

export default {
  ingestTestResults,
  getTestDetails,
  getBuildSummary,
  getFlakyTests,
  updateTestStatus,
  getTestsByStatus,
  getArtifactFile,
};
