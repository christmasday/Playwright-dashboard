import conditionalExecutionService from '../../services/conditionalExecution.js';
import { ConditionalRule } from '../../models/index.js';
import logger from '../../utils/logger.js';

export const listConditionalRules = async (req, res, next) => {
  try {
    const rules = await ConditionalRule.list();

    res.json({
      rules,
      count: rules.length,
    });
  } catch (error) {
    logger.error('Error listing conditional rules', { error: error.message });
    next(error);
  }
};

export const createConditionalRule = async (req, res, next) => {
  try {
    const { name, condition, action, enabled } = req.body;

    if (!name || !condition || !action) {
      return res.status(400).json({ error: 'name, condition, and action are required' });
    }

    const rule = await ConditionalRule.create({
      name,
      condition,
      action,
      enabled: enabled || false,
    });

    res.status(201).json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error('Error creating conditional rule', { error: error.message });
    next(error);
  }
};

export const updateConditionalRule = async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    const rule = await ConditionalRule.update(ruleId, { enabled });

    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error('Error updating conditional rule', { error: error.message });
    next(error);
  }
};

export const deleteConditionalRule = async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    const rule = await ConditionalRule.delete(ruleId);

    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error('Error deleting conditional rule', { error: error.message });
    next(error);
  }
};

export const checkTestExecution = async (req, res, next) => {
  try {
    const { testRunId } = req.params;

    const result = await conditionalExecutionService.checkConditionalExecution(testRunId);

    res.json(result);
  } catch (error) {
    logger.error('Error checking test execution', { error: error.message });
    next(error);
  }
};

export default {
  listConditionalRules,
  createConditionalRule,
  updateConditionalRule,
  deleteConditionalRule,
  checkTestExecution,
};
