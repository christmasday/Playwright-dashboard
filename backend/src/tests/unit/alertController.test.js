jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../models/alertDestination.js', () => ({
  __esModule: true,
  AlertDestination: {
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getDeliveryLogs: jest.fn(),
  },
}));

jest.mock('../../services/alertService.js', () => ({
  __esModule: true,
  default: {
    sendTestAlert: jest.fn(),
  },
}));

import alertController from '../../api/controllers/alertController.js';
import { AlertDestination } from '../../models/alertDestination.js';
import alertService from '../../services/alertService.js';


describe('Alert Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 'u-123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('listAlertDestinations', () => {
    it('returns list of destinations', async () => {
      AlertDestination.list.mockResolvedValue([{ id: 'd-1', name: 'Slack QA' }]);
      await alertController.listAlertDestinations(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
          data: [{ id: 'd-1', name: 'Slack QA' }],
        })
      );
    });
  });

  describe('createAlertDestination', () => {
    it('validates required fields', async () => {
      req.body = { name: '' };
      await alertController.createAlertDestination(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Destination name is required' }));
    });

    it('validates provider', async () => {
      req.body = { name: 'Slack Channel', provider: 'invalid_provider', webhookUrl: 'https://example.com' };
      await alertController.createAlertDestination(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid provider') }));
    });

    it('creates alert destination successfully', async () => {
      req.body = {
        name: 'Dev Slack',
        provider: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/123/456/789',
        events: 'failures_only',
      };
      AlertDestination.create.mockResolvedValue({ id: 'd-new', ...req.body });

      await alertController.createAlertDestination(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ name: 'Dev Slack', provider: 'slack' }),
        })
      );
    });
  });

  describe('testAlertDestination', () => {
    it('returns success on valid webhook test', async () => {
      req.body = {
        provider: 'discord',
        webhookUrl: 'https://discord.com/api/webhooks/123/abc',
      };
      alertService.sendTestAlert.mockResolvedValue({
        success: true,
        statusCode: 204,
        latencyMs: 120,
      });

      await alertController.testAlertDestination(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          statusCode: 204,
        })
      );
    });

    it('returns 400 when webhook dispatch fails', async () => {
      req.body = {
        provider: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/bad/url',
      };
      alertService.sendTestAlert.mockResolvedValue({
        success: false,
        statusCode: 404,
        latencyMs: 90,
        error: 'Webhook returned HTTP 404',
      });

      await alertController.testAlertDestination(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Webhook returned HTTP 404',
        })
      );
    });
  });

  describe('deleteAlertDestination', () => {
    it('deletes destination if found', async () => {
      req.params.id = 'd-del';
      AlertDestination.findById.mockResolvedValue({ id: 'd-del', name: 'To Delete' });
      AlertDestination.delete.mockResolvedValue({ id: 'd-del' });

      await alertController.deleteAlertDestination(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 'd-del' }),
        })
      );
    });
  });
});
