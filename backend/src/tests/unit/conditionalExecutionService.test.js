
// Mock every dependency so no DB / pg / sequelize is touched
jest.mock('../../models/index.js', () => ({
  __esModule: true,
  TestRun: {
    findById: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../../config/database.js', () => ({
  __esModule: true,
  query: jest.fn(),
}));
jest.mock('../../services/orchestrator.js', () => ({
  __esModule: true,
  executeBuild: jest.fn(),
}));

import conditionalExecutionService from '../../services/conditionalExecution.js';
import { TestRun } from '../../models/index.js';
import { query } from '../../config/database.js';

describe('Conditional Execution Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConditionalExecution', () => {
    it('should allow execution when test run is not found', async () => {
      TestRun.findById.mockResolvedValue(null);
      const result = await conditionalExecutionService.checkConditionalExecution('missing');
      expect(result).toEqual({ shouldExecute: true });
    });

    it('should skip execution when test is quarantined', async () => {
      TestRun.findById.mockResolvedValue({ id: 't1', status: 'quarantined' });
      const result = await conditionalExecutionService.checkConditionalExecution('t1');
      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toMatch(/quarantined/i);
    });

    it('should quarantine execution when a quarantine rule condition matches', async () => {
      TestRun.findById.mockResolvedValue({ id: 't1', status: 'passed', duration: 2000, retries: 0 });
      query.mockResolvedValue([{ name: 'Long', condition: 'duration > 1000', action: 'quarantine', enabled: true }]);

      const result = await conditionalExecutionService.checkConditionalExecution('t1');

      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toMatch(/quarantined/i);
      expect(TestRun.update).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'quarantined' }));
    });

    it('should skip (not update) when a skip rule condition matches', async () => {
      TestRun.findById.mockResolvedValue({ id: 't1', status: 'passed', duration: 2000, retries: 0 });
      query.mockResolvedValue([{ name: 'Long', condition: 'duration > 1000', action: 'skip', enabled: true }]);

      const result = await conditionalExecutionService.checkConditionalExecution('t1');

      expect(result.shouldExecute).toBe(false);
      expect(result.reason).toMatch(/skip/i);
      expect(TestRun.update).not.toHaveBeenCalled();
    });

    it('should allow execution when no rule matches', async () => {
      TestRun.findById.mockResolvedValue({ id: 't1', status: 'passed', duration: 500, retries: 0 });
      query.mockResolvedValue([{ name: 'Long', condition: 'duration > 1000', action: 'skip', enabled: true }]);

      const result = await conditionalExecutionService.checkConditionalExecution('t1');
      expect(result.shouldExecute).toBe(true);
    });

    it('should default to allow execution on error', async () => {
      TestRun.findById.mockRejectedValue(new Error('db error'));
      const result = await conditionalExecutionService.checkConditionalExecution('t1');
      expect(result).toEqual({ shouldExecute: true });
    });
  });

  describe('addConditionalRule', () => {
    it('should insert a rule into the database', async () => {
      query.mockResolvedValue([]);
      await conditionalExecutionService.addConditionalRule({
        name: 'R',
        condition: 'duration > 1',
        action: 'skip',
        enabled: true,
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conditional_rules'),
        expect.arrayContaining(['R', 'duration > 1', 'skip', true])
      );
    });
  });

  describe('updateConditionalRule', () => {
    it('should update enabled flag', async () => {
      query.mockResolvedValue([]);
      await conditionalExecutionService.updateConditionalRule('r1', false);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conditional_rules'),
        expect.arrayContaining([false, 'r1'])
      );
    });
  });

  describe('deleteConditionalRule', () => {
    it('should delete a rule', async () => {
      query.mockResolvedValue([]);
      await conditionalExecutionService.deleteConditionalRule('r1');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conditional_rules'),
        ['r1']
      );
    });
  });
});
