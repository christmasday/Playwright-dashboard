import { TestRun } from '../models/index.js';
import { executeBuild } from '../services/orchestrator.js';
import logger from '../utils/logger.js';

export const checkConditionalExecution = async (testRunId) => {
  try {
    const testRun = await TestRun.findById(testRunId);
    if (!testRun) {
      return { shouldExecute: true };
    }

    if (testRun.status === 'quarantined') {
      return { shouldExecute: false, reason: 'Test is quarantined' };
    }

    const rules = await loadConditionalRules();
    const applicableRules = rules.filter((rule) => rule.enabled);

    for (const rule of applicableRules) {
      const shouldSkip = evaluateRule(testRun, rule.condition);
      if (shouldSkip) {
        const action = rule.action === 'quarantine' ? 'quarantine' : 'skip';
        await applyRule(testRunId, rule, action);

        if (action === 'quarantine') {
          return { shouldExecute: false, reason: `Test quarantined: ${rule.name}` };
        } else {
          return { shouldExecute: false, reason: `Test skipped: ${rule.name}` };
        }
      }
    }

    return { shouldExecute: true };
  } catch (error) {
    logger.error('Error checking conditional execution', { error: error.message, testRunId });
    return { shouldExecute: true };
  }
};

export const applyRule = async (testRunId, rule, action) => {
  try {
    const testRun = await TestRun.findById(testRunId);
    if (!testRun) return;

    const now = new Date();
    const quarantineDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (action === 'quarantine') {
      await TestRun.update(testRunId, {
        status: 'quarantined',
        quarantineReason: `Quarantined by rule: ${rule.name}`,
        quarantineExpiresAt: new Date(now.getTime() + quarantineDuration),
      });
    }

    logger.info('Rule applied', { testRunId, ruleName: rule.name, action });
  } catch (error) {
    logger.error('Error applying rule', { error: error.message, testRunId, rule });
  }
};

const loadConditionalRules = async () => {
  try {
    const dbRules = await executeQuery(`
      SELECT name, condition, action, enabled
      FROM conditional_rules
      WHERE enabled = true
      ORDER BY name ASC
    `);

    return dbRules.map((rule) => ({
      name: rule.name,
      condition: rule.condition,
      action: rule.action,
      enabled: rule.enabled,
    }));
  } catch (error) {
    logger.error('Error loading conditional rules', { error: error.message });
    return [];
  }
};

const evaluateRule = (testRun, condition) => {
  try {
    const duration = testRun.duration || 0;
    const retries = testRun.retries || 0;
    const status = testRun.status || 'skipped';

    const expression = condition
      .replace(/duration/g, String(duration))
      .replace(/retries/g, String(retries))
      .replace(/status/g, `'${status}'`);

    return Boolean(eval(expression));
  } catch (error) {
    logger.error('Error evaluating rule', { error: error.message, condition });
    return false;
  }
};

const executeQuery = async (sql) => {
  const { query } = await import('../config/database.js');
  return await query(sql);
};

export const addConditionalRule = async (rule) => {
  try {
    const { query } = await import('../config/database.js');
    await query(
      `INSERT INTO conditional_rules (name, condition, action, enabled, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [rule.name, rule.condition, rule.action, rule.enabled]
    );
    logger.info('Conditional rule added', { ruleName: rule.name });
  } catch (error) {
    logger.error('Error adding conditional rule', { error: error.message, rule });
    throw error;
  }
};

export const updateConditionalRule = async (ruleId, enabled) => {
  try {
    const { query } = await import('../config/database.js');
    await query(
      `UPDATE conditional_rules SET enabled = $1, updated_at = NOW() WHERE id = $2`,
      [enabled, ruleId]
    );
    logger.info('Conditional rule updated', { ruleId, enabled });
  } catch (error) {
    logger.error('Error updating conditional rule', { error: error.message, ruleId });
    throw error;
  }
};

export const deleteConditionalRule = async (ruleId) => {
  try {
    const { query } = await import('../config/database.js');
    await query(`DELETE FROM conditional_rules WHERE id = $1`, [ruleId]);
    logger.info('Conditional rule deleted', { ruleId });
  } catch (error) {
    logger.error('Error deleting conditional rule', { error: error.message, ruleId });
    throw error;
  }
};

export default {
  checkConditionalExecution,
  applyRule,
  addConditionalRule,
  updateConditionalRule,
  deleteConditionalRule,
};
