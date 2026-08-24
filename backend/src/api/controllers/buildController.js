/**
 * Build Controller
 * Handles build-related API requests
 */

import { Build, Metrics } from '../../models/index.js';
import { Project } from '../../models/user.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const createBuild = async (req, res, next) => {
  try {
    const { name, branch, commitHash, commitMessage, environment, projectName, project } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Build name is required' });
    }

    // Resolve the reporting project from the reporter's configured project name or request.
    let projectId = req.projectId || null;
    const rawName = projectName || project;
    const resolvedName = rawName ? String(rawName).replace(/^["']|["']$/g, '').trim() : null;

    if (resolvedName) {
      try {
        let projectRecord = await Project.findByName(resolvedName);
        const creatorId = req.user?.id || null;
        if (!projectRecord) {
          projectRecord = await Project.create({
            name: resolvedName,
            description: 'Auto-created from reporter configuration',
            createdBy: creatorId,
          });
        }
        if (creatorId) {
          await Project.addMember(projectRecord.id, creatorId, 'admin');
        }
        projectId = projectRecord.id;
      } catch (projectError) {
        logger.warn('Failed to resolve reporting project', { error: projectError.message });
      }
    }

    const build = await Build.create({
      name,
      branch: branch || 'main',
      commitHash,
      commitMessage,
      environment: environment || 'ci',
      projectId,
    });

    res.status(201).json(build);
  } catch (error) {
    logger.error('Error creating build', { error: error.message });
    next(error);
  }
};

export const getBuild = async (req, res, next) => {
  try {
    const { buildId } = req.params;

    if (!buildId) {
      return res.status(400).json({ error: 'buildId is required' });
    }

    const build = await Build.findById(buildId);
    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }

    res.json(build);
  } catch (error) {
    logger.error('Error getting build', { error: error.message });
    next(error);
  }
};

export const updateBuild = async (req, res, next) => {
  try {
    const { buildId } = req.params;
    const { status, endedAt } = req.body;

    if (!buildId) {
      return res.status(400).json({ error: 'buildId is required' });
    }

    const build = await Build.update(buildId, {
      status,
      ended_at: endedAt,
    });

    res.json(build);
  } catch (error) {
    logger.error('Error updating build', { error: error.message });
    next(error);
  }
};

export const listBuilds = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, page, projectId, search, status } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedOffset = page
      ? (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit
      : (parseInt(offset, 10) || 0);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    const [builds, total] = await Promise.all([
      Build.list(parsedLimit, parsedOffset, { projectId, search, status }),
      Build.count({ projectId, search, status }),
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    res.json({
      success: true,
      count: builds.length,
      total,
      page: currentPage,
      limit: parsedLimit,
      totalPages,
      builds,
    });
  } catch (error) {
    logger.error('Error listing builds', { error: error.message });
    next(error);
  }
};

export const getBuildMetrics = async (req, res, next) => {
  try {
    const { buildId } = req.params;

    if (!buildId) {
      return res.status(400).json({ error: 'buildId is required' });
    }

    const metrics = await Metrics.findByBuildId(buildId);

    const grouped = {};
    for (const metric of metrics) {
      if (!grouped[metric.metric_type]) {
        grouped[metric.metric_type] = {};
      }
      grouped[metric.metric_type][metric.metric_key] = metric.metric_value;
    }

    res.json(grouped);
  } catch (error) {
    logger.error('Error getting build metrics', { error: error.message });
    next(error);
  }
};

export default {
  createBuild,
  getBuild,
  updateBuild,
  listBuilds,
  getBuildMetrics,
};
