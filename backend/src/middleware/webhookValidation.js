import crypto from 'crypto';

export const validateWebhookSignature = (provider) => {
  return (req, res, next) => {
    const signature = req.headers['x-hub-signature'] || req.headers['x-gitlab-token'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    try {
      const body = JSON.stringify(req.body);

      if (provider === 'github') {
        const secret = process.env.GITHUB_WEBHOOK_SECRET || 'your-github-secret';
        const hash = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');

        if (signature !== `sha256=${hash}`) {
          return res.status(401).json({ error: 'Invalid GitHub webhook signature' });
        }
      } else if (provider === 'gitlab') {
        const token = process.env.GITLAB_WEBHOOK_TOKEN || 'your-gitlab-token';
        if (signature !== token) {
          return res.status(401).json({ error: 'Invalid GitLab webhook token' });
        }
      } else if (provider === 'jenkins') {
        const token = process.env.JENKINS_WEBHOOK_TOKEN || 'your-jenkins-token';
        if (signature !== token) {
          return res.status(401).json({ error: 'Invalid Jenkins webhook token' });
        }
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Webhook signature validation failed' });
    }
  };
};

export const extractWebhookData = (provider) => {
  return (req, res, next) => {
    try {
      if (provider === 'github') {
        req.webhookData = {
          type: req.headers['x-github-event'],
          payload: req.body,
          repository: req.body.repository,
          sender: req.body.sender,
        };
      } else if (provider === 'gitlab') {
        req.webhookData = {
          type: req.headers['x-gitlab-event'],
          payload: req.body,
          project: req.body.project,
          user: req.body.user,
        };
      } else if (provider === 'jenkins') {
        req.webhookData = {
          type: 'jenkins',
          payload: req.body,
          build: req.body,
        };
      }

      next();
    } catch (error) {
      res.status(400).json({ error: 'Failed to extract webhook data' });
    }
  };
};
