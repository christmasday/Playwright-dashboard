import express from 'express';
import conditionalExecutionController from '../controllers/conditionalExecutionController.js';
import { apiKeyAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(apiKeyAuth);

router.get('/rules', conditionalExecutionController.listConditionalRules);
router.post('/rules', conditionalExecutionController.createConditionalRule);
router.patch('/rules/:ruleId', conditionalExecutionController.updateConditionalRule);
router.delete('/rules/:ruleId', conditionalExecutionController.deleteConditionalRule);
router.post('/check/:testRunId', conditionalExecutionController.checkTestExecution);

export default router;
