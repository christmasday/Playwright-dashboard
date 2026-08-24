/**
 * Orchestrator Service
 * Coordinates build execution triggered by webhooks / API requests.
 */

import logger from '../utils/logger.js';

/**
 * Execute a build by id with the provided options.
 * @param {string} buildId
 * @param {object} options - { source, branch, commitHash, commitMessage, repository, owner, buildNumber }
 * @returns {Promise<void>}
 */
export const executeBuild = async (buildId, options = {}) => {
  try {
    logger.info('Executing build', { buildId, source: options.source });
    // TODO: dispatch to the actual runner (Playwright worker / CI agent).
    // For now this is a stub that acknowledges the request.
    return { buildId, started: true, options };
  } catch (error) {
    logger.error('Build execution failed', { buildId, error: error.message });
    throw error;
  }
};

export default { executeBuild };
