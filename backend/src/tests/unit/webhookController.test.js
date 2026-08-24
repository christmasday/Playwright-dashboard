
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  Build: {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));
jest.mock('../../services/orchestrator.js', () => ({
  __esModule: true,
  executeBuild: jest.fn(),
}));

import webhookController from '../../api/controllers/webhookController.js';
import { Build } from '../../models/index.js';
import { executeBuild } from '../../services/orchestrator.js';

describe('Webhook Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('handleGitHubWebhook', () => {
    it('should create a build and execute on push', async () => {
      Build.create.mockResolvedValue({ id: 'b1' });
      executeBuild.mockResolvedValue(undefined);
      req = {
        webhookData: {
          type: 'push',
          payload: {
            repository: { name: 'repo', owner: { login: 'o' } },
            ref: 'refs/heads/main',
            after: 'abc123',
            head_commit: { id: 'abc123', message: 'msg' },
          },
        },
      };

      await webhookController.handleGitHubWebhook(req, res);

      expect(Build.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'GitHub Push - repo', branch: 'main', commitHash: 'abc123' })
      );
      expect(executeBuild).toHaveBeenCalledWith('b1', expect.objectContaining({ source: 'github' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, buildId: 'b1' });
    });

    it('should return 200 for unsupported event types', async () => {
      req = { webhookData: { type: 'unknown', payload: {} } };
      await webhookController.handleGitHubWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Webhook type not yet implemented' })
      );
    });

    it('should return 500 when execution fails', async () => {
      Build.create.mockResolvedValue({ id: 'b1' });
      executeBuild.mockRejectedValue(new Error('exec failed'));
      req = {
        webhookData: {
          type: 'push',
          payload: {
            repository: { name: 'repo', owner: { login: 'o' } },
            ref: 'refs/heads/main',
            after: 'abc123',
            head_commit: { id: 'abc123', message: 'msg' },
          },
        },
      };
      await webhookController.handleGitHubWebhook(req, res);
      expect(Build.findByIdAndUpdate).toHaveBeenCalledWith('b1', { status: 'failed' });
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleGitLabWebhook', () => {
    it('should create a build on Push Hook', async () => {
      Build.create.mockResolvedValue({ id: 'b2' });
      executeBuild.mockResolvedValue(undefined);
      req = {
        webhookData: {
          type: 'Push Hook',
          payload: {
            project: { name: 'proj' },
            ref: 'refs/heads/dev',
            checkout_sha: 'def456',
            message: 'gl msg',
          },
        },
      };
      await webhookController.handleGitLabWebhook(req, res);
      expect(Build.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'GitLab Push - proj', branch: 'dev' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('handleJenkinsWebhook', () => {
    it('should create a build on jenkins event', async () => {
      Build.create.mockResolvedValue({ id: 'b3' });
      executeBuild.mockResolvedValue(undefined);
      req = {
        webhookData: {
          type: 'jenkins',
          payload: {
            build: { fullDisplayName: 'J #1', branch: 'master', revision: 'rev1', message: 'j msg', number: 1 },
          },
        },
      };
      await webhookController.handleJenkinsWebhook(req, res);
      expect(Build.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jenkins - J #1', branch: 'master' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStatus', () => {
    it('should report webhook configuration status', async () => {
      const original = process.env;
      process.env = { ...original, GITHUB_WEBHOOK_SECRET: 'x' };
      await webhookController.getStatus(req, res);
      const body = res.json.mock.calls[0][0];
      expect(body.github).toBe(true);
      process.env = original;
    });
  });
});
