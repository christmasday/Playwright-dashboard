
// Mock the models module (which otherwise pulls in sequelize + pg)
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  Build: {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  Metrics: {
    findByBuildId: jest.fn(),
  },
}));

jest.mock('../../models/user.js', () => ({
  __esModule: true,
  Project: {
    findByName: jest.fn(),
    create: jest.fn(),
    addMember: jest.fn(),
  },
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import buildController from '../../api/controllers/buildController.js';
import { Build, Metrics } from '../../models/index.js';

describe('Build Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('createBuild', () => {
    it('should create a build and return 201', async () => {
      Build.create.mockResolvedValue({ id: 'b1', name: 'Build 1', status: 'running' });
      req = { body: { name: 'Build 1', branch: 'main', environment: 'ci' } };

      await buildController.createBuild(req, res, next);

      expect(Build.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Build 1', branch: 'main', environment: 'ci' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'b1', name: 'Build 1', status: 'running' });
    });

    it('should return 400 when name is missing', async () => {
      req = { body: {} };
      await buildController.createBuild(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Build name is required' });
    });

    it('should call next on error', async () => {
      Build.create.mockRejectedValue(new Error('db down'));
      req = { body: { name: 'Build 1' } };
      await buildController.createBuild(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getBuild', () => {
    it('should return a build by id', async () => {
      Build.findById.mockResolvedValue({ id: 'b1', name: 'Build 1' });
      req = { params: { buildId: 'b1' } };
      await buildController.getBuild(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ id: 'b1', name: 'Build 1' });
    });

    it('should return 404 when build not found', async () => {
      Build.findById.mockResolvedValue(null);
      req = { params: { buildId: 'missing' } };
      await buildController.getBuild(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when buildId missing', async () => {
      req = { params: {} };
      await buildController.getBuild(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateBuild', () => {
    it('should update a build', async () => {
      Build.update.mockResolvedValue({ id: 'b1', status: 'passed' });
      req = { params: { buildId: 'b1' }, body: { status: 'passed' } };
      await buildController.updateBuild(req, res, next);
      expect(Build.update).toHaveBeenCalledWith('b1', expect.objectContaining({ status: 'passed' }));
      expect(res.json).toHaveBeenCalledWith({ id: 'b1', status: 'passed' });
    });

    it('should return 400 when buildId missing', async () => {
      req = { params: {}, body: {} };
      await buildController.updateBuild(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listBuilds', () => {
    it('should list builds with count', async () => {
      Build.list.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
      Build.count.mockResolvedValue(2);
      req = { query: { limit: '50', offset: '0' } };
      await buildController.listBuilds(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 2, builds: expect.any(Array) })
      );
    });
  });

  describe('getBuildMetrics', () => {
    it('should group metrics by type', async () => {
      Metrics.findByBuildId.mockResolvedValue([
        { metric_type: 'duration', metric_key: 'avg', metric_value: 10 },
        { metric_type: 'duration', metric_key: 'max', metric_value: 20 },
      ]);
      req = { params: { buildId: 'b1' } };
      await buildController.getBuildMetrics(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.duration).toEqual({ avg: 10, max: 20 });
    });

    it('should return 400 when buildId missing', async () => {
      req = { params: {} };
      await buildController.getBuildMetrics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
