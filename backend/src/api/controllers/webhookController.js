import { Build } from '../../models/index.js';
import logger from '../../utils/logger.js';
import { executeBuild } from '../../services/orchestrator.js';

export const handleGitHubWebhook = async (req, res) => {
  try {
    const webhookData = req.webhookData || {
      type: req.headers['x-github-event'] || 'push',
      payload: req.body || {},
    };
    const { type, payload } = webhookData;

    logger.info('GitHub webhook received', { type, repository: payload?.repository?.name });

    if (type === 'push') {
      const buildName = `GitHub Push - ${payload?.repository?.name || payload?.repository?.full_name || 'unknown'}`;
      const branch = (payload?.ref || 'refs/heads/main').replace('refs/heads/', '');

      const build = await Build.create({
        name: buildName,
        branch,
        commitHash: payload.after || payload.head_commit?.id,
        commitMessage: payload.head_commit?.message || 'No commit message',
        environment: 'github',
        status: 'running',
      });

      try {
        await executeBuild(build.id, {
          source: 'github',
          branch,
          commitHash: payload.after,
          commitMessage: payload.head_commit?.message,
          repository: payload.repository?.name,
          owner: payload.repository?.owner?.login,
        });

        res.status(200).json({ success: true, buildId: build.id });
      } catch (executeError) {
        await Build.findByIdAndUpdate(build.id, { status: 'failed' });
        logger.error('Build execution failed', { buildId: build.id, error: executeError.message });
        res.status(500).json({ error: 'Build execution failed' });
      }
    } else {
      res.status(200).json({ success: true, message: 'Webhook type not yet implemented' });
    }
  } catch (error) {
    logger.error('Error handling GitHub webhook', { error: error.message });
    res.status(500).json({ error: 'Error processing GitHub webhook' });
  }
};

export const handleGitLabWebhook = async (req, res) => {
  try {
    const { type, payload } = req.webhookData;

    logger.info('GitLab webhook received', { type, project: payload.project?.name });

    if (type === 'Push Hook') {
      const buildName = `GitLab Push - ${payload.project?.name || 'unknown'}`;
      const branch = payload.ref?.replace('refs/heads/', '');

      const build = await Build.create({
        name: buildName,
        branch,
        commitHash: payload.checkout_sha || payload.after,
        commitMessage: payload.message || 'No commit message',
        environment: 'gitlab',
        status: 'running',
      });

      try {
        await executeBuild(build.id, {
          source: 'gitlab',
          branch,
          commitHash: payload.checkout_sha || payload.after,
          commitMessage: payload.message,
          repository: payload.project?.name,
        });

        res.status(200).json({ success: true, buildId: build.id });
      } catch (executeError) {
        await Build.findByIdAndUpdate(build.id, { status: 'failed' });
        logger.error('Build execution failed', { buildId: build.id, error: executeError.message });
        res.status(500).json({ error: 'Build execution failed' });
      }
    } else {
      res.status(200).json({ success: true, message: 'Webhook type not yet implemented' });
    }
  } catch (error) {
    logger.error('Error handling GitLab webhook', { error: error.message });
    res.status(500).json({ error: 'Error processing GitLab webhook' });
  }
};

export const handleJenkinsWebhook = async (req, res) => {
  try {
    const { type, payload } = req.webhookData;

    logger.info('Jenkins webhook received', { build: payload.build?.fullDisplayName });

    if (type === 'jenkins') {
      const buildName = `Jenkins - ${payload.build?.fullDisplayName || 'unknown'}`;
      const branch = payload.build?.branch || 'master';

      const build = await Build.create({
        name: buildName,
        branch,
        commitHash: payload.build?.revision || payload.build?.revision_id,
        commitMessage: payload.build?.message || 'No commit message',
        environment: 'jenkins',
        status: 'running',
      });

      try {
        await executeBuild(build.id, {
          source: 'jenkins',
          branch,
          commitHash: payload.build?.revision || payload.build?.revision_id,
          commitMessage: payload.build?.message,
          buildNumber: payload.build?.number,
        });

        res.status(200).json({ success: true, buildId: build.id });
      } catch (executeError) {
        await Build.findByIdAndUpdate(build.id, { status: 'failed' });
        logger.error('Build execution failed', { buildId: build.id, error: executeError.message });
        res.status(500).json({ error: 'Build execution failed' });
      }
    } else {
      res.status(200).json({ success: true, message: 'Webhook type not yet implemented' });
    }
  } catch (error) {
    logger.error('Error handling Jenkins webhook', { error: error.message });
    res.status(500).json({ error: 'Error processing Jenkins webhook' });
  }
};

export const getStatus = async (req, res) => {
  try {
    const status = {
      github: !!process.env.GITHUB_WEBHOOK_SECRET,
      gitlab: !!process.env.GITLAB_WEBHOOK_TOKEN,
      jenkins: !!process.env.JENKINS_WEBHOOK_TOKEN,
    };

    res.json(status);
  } catch (error) {
    logger.error('Error getting webhook status', { error: error.message });
    res.status(500).json({ error: 'Error fetching webhook status' });
  }
};

export default {
  handleGitHubWebhook,
  handleGitLabWebhook,
  handleJenkinsWebhook,
  getStatus,
};
