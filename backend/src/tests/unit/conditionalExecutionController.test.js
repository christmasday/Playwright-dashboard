
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  ConditionalRule: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../services/conditionalExecution');

import conditionalExecutionController from '../../api/controllers/conditionalExecutionController.js';
import conditionalExecutionService from '../../services/conditionalExecution.js';
import { ConditionalRule } from '../../models/index.js';

describe('Conditional Execution Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('listConditionalRules', () => {
    it('should list rules with count', async () => {
      ConditionalRule.list.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
      req = {};
      await conditionalExecutionController.listConditionalRules(req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body.count).toBe(2);
      expect(body.rules).toEqual([{ id: 'r1' }, { id: 'r2' }]);
    });
  });

  describe('createConditionalRule', () => {
    it('should create a rule and return 201', async () => {
      ConditionalRule.create.mockResolvedValue({ id: 'r1', name: 'Rule', enabled: true });
      req = { body: { name: 'Rule', condition: 'duration > 1', action: 'skip', enabled: true } };
      await conditionalExecutionController.createConditionalRule(req, res, next);
      expect(ConditionalRule.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rule', condition: 'duration > 1', action: 'skip', enabled: true })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when required fields missing', async () => {
      req = { body: { name: 'Rule' } };
      await conditionalExecutionController.createConditionalRule(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateConditionalRule', () => {
    it('should update a rule', async () => {
      ConditionalRule.update.mockResolvedValue({ id: 'r1', enabled: false });
      req = { params: { ruleId: 'r1' }, body: { enabled: false } };
      await conditionalExecutionController.updateConditionalRule(req, res, next);
      expect(ConditionalRule.update).toHaveBeenCalledWith('r1', { enabled: false });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, rule: { id: 'r1', enabled: false } })
      );
    });
  });

  describe('deleteConditionalRule', () => {
    it('should delete a rule', async () => {
      ConditionalRule.delete.mockResolvedValue({ id: 'r1' });
      req = { params: { ruleId: 'r1' } };
      await conditionalExecutionController.deleteConditionalRule(req, res, next);
      expect(ConditionalRule.delete).toHaveBeenCalledWith('r1');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, rule: { id: 'r1' } })
      );
    });
  });

  describe('checkTestExecution', () => {
    it('should return conditional execution result', async () => {
      const result = { shouldExecute: false, action: 'skip' };
      conditionalExecutionService.checkConditionalExecution.mockResolvedValue(result);
      req = { params: { testRunId: 't1' } };
      await conditionalExecutionController.checkTestExecution(req, res, next);
      expect(conditionalExecutionService.checkConditionalExecution).toHaveBeenCalledWith('t1');
      expect(res.json).toHaveBeenCalledWith(result);
    });
  });
});
