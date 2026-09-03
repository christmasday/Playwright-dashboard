/**
 * AI Analysis Service
 * Multi-provider LLM orchestration engine with dynamic model discovery,
 * BYOK credential resolution, and zero-setup deterministic heuristic fallback.
 */

import logger from '../utils/logger.js';
import { AiAnalysis } from '../models/aiAnalysis.js';
import { TestRun, TestResult } from '../models/index.js';

export const SUPPORTED_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Ultra-fast multimodal reasoning & high token efficiency',
    icon: 'fa-wand-magic-sparkles',
    defaultModel: 'gemini-2.5-flash',
    presetModels: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    requiresKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Flagship GPT-4o and reasoning models',
    icon: 'fa-robot',
    defaultModel: 'gpt-4o-mini',
    presetModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cost Effective)' },
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' },
      { id: 'o3-mini', name: 'o3-mini (Reasoning & Code Logic)' },
      { id: 'o1', name: 'o1 (Deepest Problem Solving)' },
    ],
    requiresKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Exceptional coding precision & extended thinking',
    icon: 'fa-brain',
    defaultModel: 'claude-3-7-sonnet-20250219',
    presetModels: [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Thinking & Coding)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Ultra Fast)' },
    ],
    requiresKey: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Lightning-fast LPU inference (500+ tokens/sec)',
    icon: 'fa-bolt',
    defaultModel: 'llama-3.3-70b-versatile',
    presetModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
      { id: 'deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B' },
    ],
    requiresKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    description: 'State-of-the-art coding and mathematical reasoning',
    icon: 'fa-microchip',
    defaultModel: 'deepseek-chat',
    presetModels: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 (Chat & Code)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Chain-of-Thought Reasoning)' },
    ],
    requiresKey: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Optimized developer models including Codestral',
    icon: 'fa-wind',
    defaultModel: 'codestral-latest',
    presetModels: [
      { id: 'codestral-latest', name: 'Codestral Latest (Specialized Code Generation)' },
      { id: 'mistral-large-latest', name: 'Mistral Large Latest' },
      { id: 'mistral-small-latest', name: 'Mistral Small Latest' },
    ],
    requiresKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Universal gateway to every open & closed model',
    icon: 'fa-network-wired',
    defaultModel: 'openrouter/auto',
    presetModels: [
      { id: 'openrouter/auto', name: 'OpenRouter Auto (Optimal routing)' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet via OpenRouter' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek-R1 via OpenRouter' },
    ],
    requiresKey: true,
  },
  {
    id: 'ollama',
    name: 'Local Ollama / Custom Endpoint',
    description: '100% on-premise, zero-data-leakage local LLMs',
    icon: 'fa-server',
    defaultModel: 'qwen2.5-coder',
    presetModels: [
      { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder' },
      { id: 'llama3.3', name: 'Llama 3.3' },
      { id: 'deepseek-r1', name: 'DeepSeek-R1 (Local)' },
    ],
    requiresKey: false,
    hasCustomEndpoint: true,
    defaultEndpoint: 'http://localhost:11434/v1',
  },
  {
    id: 'heuristics',
    name: 'Built-in Offline Heuristics',
    description: 'Deterministic Playwright rule engine (No API key needed)',
    icon: 'fa-code',
    defaultModel: 'rule-engine-v1',
    presetModels: [{ id: 'rule-engine-v1', name: 'Playwright Expert Rules Engine' }],
    requiresKey: false,
  },
];

export const aiAnalysisService = {
  /**
   * Get supported providers configuration
   */
  getSupportedProviders: () => {
    return SUPPORTED_PROVIDERS;
  },

  /**
   * Fetch live, currently active models supported by the provider's API key.
   * Ensures selections are never deprecated.
   */
  fetchLiveModels: async (provider, apiKey, customEndpoint = null) => {
    try {
      if (provider === 'heuristics') {
        return [{ id: 'rule-engine-v1', name: 'Playwright Expert Rules Engine' }];
      }

      if (!apiKey && provider !== 'ollama') {
        throw new Error(`API key is required to fetch models for ${provider}`);
      }

      switch (provider) {
        case 'gemini': {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { method: 'GET', signal: AbortSignal.timeout(10000) }
          );
          if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Gemini API error (${resp.status}): ${err}`);
          }
          const data = await resp.json();
          const models = (data.models || [])
            .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m) => {
              const cleanId = m.name.replace(/^models\//, '');
              return { id: cleanId, name: m.displayName || cleanId, description: m.description || '' };
            });
          return models.length > 0 ? models : SUPPORTED_PROVIDERS.find((p) => p.id === 'gemini').presetModels;
        }

        case 'openai':
        case 'groq':
        case 'deepseek':
        case 'mistral':
        case 'openrouter':
        case 'ollama': {
          let baseUrl = 'https://api.openai.com/v1';
          if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
          if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com';
          if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1';
          if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
          if (provider === 'ollama') baseUrl = (customEndpoint || 'http://localhost:11434/v1').replace(/\/$/, '');

          const headers = { 'Content-Type': 'application/json' };
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

          const resp = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
          });

          if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`${provider} models API error (${resp.status}): ${err}`);
          }

          const data = await resp.json();
          const rawModels = data.data || data.models || [];
          const models = rawModels
            .map((m) => ({ id: m.id || m.name, name: m.id || m.name }))
            .filter((m) => m.id && !m.id.includes('whisper') && !m.id.includes('tts') && !m.id.includes('dall-e'));

          return models.length > 0
            ? models
            : SUPPORTED_PROVIDERS.find((p) => p.id === provider)?.presetModels || [];
        }

        case 'anthropic': {
          const resp = await fetch('https://api.anthropic.com/v1/models', {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!resp.ok) {
            // If models list endpoint returns 404/400 on older accounts, return curated list
            return SUPPORTED_PROVIDERS.find((p) => p.id === 'anthropic').presetModels;
          }

          const data = await resp.json();
          const models = (data.data || []).map((m) => ({
            id: m.id,
            name: m.display_name || m.id,
          }));

          return models.length > 0 ? models : SUPPORTED_PROVIDERS.find((p) => p.id === 'anthropic').presetModels;
        }

        default:
          return SUPPORTED_PROVIDERS.find((p) => p.id === provider)?.presetModels || [];
      }
    } catch (error) {
      logger.warn(`Failed to dynamically fetch models for ${provider}, falling back to preset list`, {
        error: error.message,
      });
      const fallback = SUPPORTED_PROVIDERS.find((p) => p.id === provider)?.presetModels || [];
      return fallback;
    }
  },

  /**
   * Test connection to provider with user's key and measure latency
   */
  testConnection: async (provider, apiKey, customEndpoint = null, model = null) => {
    const startTime = Date.now();
    try {
      if (provider === 'heuristics') {
        return {
          success: true,
          latencyMs: 1,
          message: 'Built-in Playwright heuristic rule engine is ready (zero network latency).',
        };
      }

      if (!apiKey && provider !== 'ollama') {
        return { success: false, error: 'API key is required to test connection.' };
      }

      // Test by querying models or sending a lightweight minimal prompt
      const models = await aiAnalysisService.fetchLiveModels(provider, apiKey, customEndpoint);
      const latencyMs = Date.now() - startTime;

      if (!models || models.length === 0) {
        return { success: false, error: 'Connected to endpoint, but no chat models were returned.' };
      }

      return {
        success: true,
        latencyMs,
        modelsCount: models.length,
        message: `Successfully connected to ${provider}! Found ${models.length} active models in ${latencyMs}ms.`,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Connection test failed', { provider, error: error.message });
      return {
        success: false,
        latencyMs,
        error: error.message || 'Connection test failed. Please verify API key and network connectivity.',
      };
    }
  },

  /**
   * Analyze failed test run and return structured root cause and fix recommendation
   */
  analyzeTestRun: async (testRunId, { userAiSettings = null, forceRegenerate = false } = {}) => {
    try {
      // 1. Check cache first unless forceRegenerate is true
      if (!forceRegenerate) {
        const cached = await AiAnalysis.findByTestRunId(testRunId);
        if (cached) {
          return { ...cached, cached: true };
        }
      }

      // 2. Fetch test run & step failure context
      const testRun = await TestRun.findById(testRunId);
      if (!testRun) {
        throw new Error(`Test run ${testRunId} not found`);
      }

      const rawSteps = await TestResult.findByTestRunId(testRunId).catch(() => []);
      const steps = (rawSteps || []).map((s) => ({
        stepTitle: s.step_title || s.stepTitle || s.title || s.name || '',
        stepNumber: s.step_number || s.stepNumber || 1,
        status: s.status,
        duration: s.duration || 0,
        error: s.error || null,
        errorLocation: s.error_location || s.errorLocation || null,
      }));

      const failedSteps = steps.filter((s) => s.status === 'failed');
      const failedStepWithMsg = failedSteps.find((s) => s.error && s.error.trim() !== '');

      const errorMessage = testRun.error || (failedStepWithMsg ? failedStepWithMsg.error : null) || 'Unknown assertion failure';
      const stackTrace = testRun.stack_trace || testRun.stackTrace || (failedStepWithMsg ? failedStepWithMsg.errorLocation : null);

      const context = {
        testTitle: testRun.title || testRun.name || 'Unnamed Test',
        file: testRun.file || 'unknown.spec.ts',
        errorMessage,
        stackTrace,
        failedStepTitle: failedStepWithMsg ? failedStepWithMsg.stepTitle : null,
        failedStepNumber: failedStepWithMsg ? failedStepWithMsg.stepNumber : null,
        duration: testRun.duration || 0,
      };

      // 3. Determine active provider & credentials (User BYOK -> Server .env -> Heuristics)
      const resolved = resolveProviderCredentials(userAiSettings);

      const startTime = Date.now();
      let analysisResult;

      if (resolved.provider === 'heuristics' || !resolved.apiKey) {
        analysisResult = analyzeWithHeuristics(context);
      } else {
        try {
          analysisResult = await dispatchToLlm(resolved, context);
        } catch (llmError) {
          logger.warn(`LLM analysis failed with provider ${resolved.provider}, falling back to heuristics`, {
            error: llmError.message,
          });
          analysisResult = analyzeWithHeuristics(context);
          analysisResult.summary = `[Fallback from ${resolved.provider}]: ${analysisResult.summary}`;
        }
      }

      const latencyMs = Date.now() - startTime;

      // 4. Invalidate old cache if forceRegenerate
      if (forceRegenerate) {
        await AiAnalysis.deleteByTestRunId(testRunId);
      }

      // 5. Persist to cache
      const saved = await AiAnalysis.create({
        testRunId,
        provider: resolved.provider,
        model: resolved.model || 'default',
        category: analysisResult.category,
        confidenceScore: analysisResult.confidenceScore,
        summary: analysisResult.summary,
        rootCauseDetails: analysisResult.rootCauseDetails,
        suggestedFix: analysisResult.suggestedFix,
        preventionTips: analysisResult.preventionTips,
        latencyMs,
      });

      return {
        ...saved,
        cached: false,
      };
    } catch (error) {
      logger.error('Error in analyzeTestRun', { testRunId, error: error.message });
      throw error;
    }
  },

  /**
   * Analyze an entire cluster of failed tests sharing the same error pattern
   */
  analyzeCluster: async (clusterData, { userAiSettings = null } = {}) => {
    const context = {
      testTitle: `Cluster: ${clusterData.headline || 'Multiple Tests'}`,
      file: clusterData.failingLocation || 'Multiple Spec Files',
      errorMessage: clusterData.normalizedError || 'Cluster error signature',
      stackTrace: clusterData.commonStackTrace,
      affectedCount: clusterData.affectedCount || 1,
    };

    const resolved = resolveProviderCredentials(userAiSettings);
    const startTime = Date.now();
    let result;

    if (resolved.provider === 'heuristics' || !resolved.apiKey) {
      result = analyzeWithHeuristics(context);
    } else {
      try {
        result = await dispatchToLlm(resolved, context);
      } catch (err) {
        result = analyzeWithHeuristics(context);
      }
    }

    result.latencyMs = Date.now() - startTime;
    result.provider = resolved.provider;
    result.model = resolved.model;
    return result;
  },
};

// ============================================================================
// Internal Helpers & Provider Drivers
// ============================================================================

function resolveProviderCredentials(userSettings) {
  let settings = userSettings;
  if (typeof settings === 'string') {
    try {
      settings = JSON.parse(settings);
    } catch (_) {
      settings = null;
    }
  }

  // 1. Check user BYOK settings
  if (settings && settings.preferredProvider && settings.preferredProvider !== 'heuristics') {
    const provider = settings.preferredProvider;
    const apiKey = settings.apiKey || null;
    const model = settings.model || SUPPORTED_PROVIDERS.find((p) => p.id === provider)?.defaultModel;
    const customEndpoint = settings.customEndpoint || null;

    if (apiKey || provider === 'ollama') {
      return { provider, apiKey, model, customEndpoint };
    }
  }

  // 2. Server-wide environment variable fallbacks
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-7-sonnet-20250219',
    };
  }

  // 3. Zero-setup offline heuristics fallback
  return {
    provider: 'heuristics',
    apiKey: null,
    model: 'rule-engine-v1',
  };
}

const SYSTEM_PROMPT = `
You are an expert Playwright End-to-End Test Automation Diagnostic Engineer.
Analyze the provided test failure context and output STRICT JSON conforming exactly to this structure:
{
  "category": "SELECTOR_DRIFT" | "HYDRATION_RACE" | "ASSERTION_REGRESSION" | "NETWORK_API_500" | "TIMEOUT_EXCEEDED" | "INFRA_SETUP",
  "confidenceScore": <integer 70-99>,
  "summary": "<Concise 1-2 sentence explanation of what failed and why>",
  "rootCauseDetails": "<Technical step-by-step breakdown of the failure mechanism>",
  "suggestedFix": {
    "beforeCode": "<The failing or fragile Playwright code snippet>",
    "afterCode": "<The drop-in robust replacement Playwright code>",
    "explanation": "<Why this replacement code fixes the issue and prevents future flakiness>"
  },
  "preventionTips": [
    "<Actionable bullet point tip 1>",
    "<Actionable bullet point tip 2>"
  ]
}
Return ONLY valid raw JSON. Do not include markdown code fence formatting outside the JSON.
`;

async function dispatchToLlm(resolved, context) {
  const userPrompt = `
Test Specification: ${context.file}
Test Title: ${context.testTitle}
Failed Step: ${context.failedStepTitle || 'N/A'} (Step #${context.failedStepNumber || 'N/A'})
Error Message:
${context.errorMessage}

Stack Trace / Call Log:
${context.stackTrace || 'No stack trace'}
`;

  switch (resolved.provider) {
    case 'gemini':
      return await callGemini(resolved, userPrompt);
    case 'anthropic':
      return await callAnthropic(resolved, userPrompt);
    case 'openai':
    case 'groq':
    case 'deepseek':
    case 'mistral':
    case 'openrouter':
    case 'ollama':
      return await callOpenAiCompatible(resolved, userPrompt);
    default:
      return analyzeWithHeuristics(context);
  }
}

async function callGemini(resolved, userPrompt) {
  const model = resolved.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolved.apiKey}`;

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response received from Gemini');
  return cleanAndParseJson(text);
}

async function callOpenAiCompatible(resolved, userPrompt) {
  let baseUrl = 'https://api.openai.com/v1';
  if (resolved.provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
  if (resolved.provider === 'deepseek') baseUrl = 'https://api.deepseek.com';
  if (resolved.provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1';
  if (resolved.provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
  if (resolved.provider === 'ollama') baseUrl = (resolved.customEndpoint || 'http://localhost:11434/v1').replace(/\/$/, '');

  const model = resolved.model || SUPPORTED_PROVIDERS.find((p) => p.id === resolved.provider)?.defaultModel;
  const headers = { 'Content-Type': 'application/json' };
  if (resolved.apiKey) headers['Authorization'] = `Bearer ${resolved.apiKey}`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
  };

  // Enable JSON mode when supported (OpenAI, Groq, Mistral, OpenRouter)
  if (resolved.provider !== 'deepseek') {
    payload.response_format = { type: 'json_object' };
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resolved.provider} API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Empty content returned by ${resolved.provider}`);
  return cleanAndParseJson(content);
}

async function callAnthropic(resolved, userPrompt) {
  const model = resolved.model || 'claude-3-7-sonnet-20250219';
  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.1,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': resolved.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Anthropic');
  return cleanAndParseJson(text);
}

function cleanAndParseJson(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// ============================================================================
// Built-in Deterministic Playwright Heuristic Rules Engine
// ============================================================================

export function analyzeWithHeuristics(context) {
  const err = (context.errorMessage || '').toLowerCase();
  const stack = (context.stackTrace || '').toLowerCase();
  const step = (context.failedStepTitle || '').toLowerCase();
  const combined = `${err}\n${stack}\n${step}`;

  // 1. Strict Mode Violation: resolved to N elements
  if (combined.includes('strict mode violation') || combined.includes('resolved to') || combined.includes('elements')) {
    const matchCount = combined.match(/resolved to (\d+) elements/i);
    const count = matchCount ? matchCount[1] : 'multiple';

    return {
      category: 'SELECTOR_DRIFT',
      confidenceScore: 95,
      summary: `Playwright strict mode violation: The target locator ambiguously matched ${count} elements on the page instead of exactly one.`,
      rootCauseDetails: `In Playwright, locators resolve with strict mode enabled by default. When an action like .click() or .fill() is called on a selector that matches more than one node in the DOM, Playwright intentionally throws an error to prevent executing actions on the wrong element.`,
      suggestedFix: {
        beforeCode: `// Failing ambiguous locator:\nawait page.locator('.btn-submit').click();`,
        afterCode: `// Option A: Use specific user-facing accessible role and name\nawait page.getByRole('button', { name: 'Submit Order' }).click();\n\n// Option B: Scope locator using .filter() or .first()\nawait page.locator('.checkout-container').getByRole('button', { name: 'Submit' }).click();`,
        explanation: `Refining the locator using accessible getByRole() or filtering by a specific parent container guarantees unique resolution and eliminates flakiness when duplicate buttons or DOM clones are present.`,
      },
      preventionTips: [
        'Prefer Playwright web-first locators: page.getByRole(), page.getByText(), or page.getByTestId().',
        'Avoid generic CSS class selectors like .btn, .icon, or .action-item that match repeated components.',
      ],
    };
  }

  // 2. Timeout waiting for selector / element not visible
  if (combined.includes('timeout') && (combined.includes('waiting for locator') || combined.includes('waiting for selector') || combined.includes('waiting for getby'))) {
    const locMatch = context.errorMessage?.match(/waiting for (locator|getByRole|getByText)\(([^)]+)\)/i);
    const locTarget = locMatch ? locMatch[0] : 'page.locator(...)';

    return {
      category: 'SELECTOR_DRIFT',
      confidenceScore: 92,
      summary: `Locator timeout: Playwright exceeded the action timeout while waiting for the target element to become attached and visible in the DOM.`,
      rootCauseDetails: `The test waited for ${locTarget} to appear, but the element was never rendered within the allotted timeout window. This is typically caused by a renamed class/ID in recent frontend changes, an unfulfilled prerequisite step (e.g. uncompleted form or modal not open), or a slow asynchronous API response.`,
      suggestedFix: {
        beforeCode: `// Timed out waiting for element:\nawait page.locator('${locTarget}').click();`,
        afterCode: `// 1. Ensure preceding API or state transition has completed:\nawait page.waitForResponse((resp) => resp.url().includes('/api/items') && resp.status() === 200);\n\n// 2. Use resilient accessible locator:\nawait expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible({ timeout: 10000 });\nawait page.getByRole('button', { name: 'Confirm' }).click();`,
        explanation: `Explicitly awaiting the backend response before locator interaction ensures the DOM has hydrated and the target button is active.`,
      },
      preventionTips: [
        'Do NOT use arbitrary page.waitForTimeout(5000); instead use await expect(locator).toBeVisible().',
        'Verify if backend network mock or feature flag is enabled in the test environment.',
      ],
    };
  }

  // 3. Hydration Race / Detached DOM / Click Intercepted
  if (combined.includes('detached from the dom') || combined.includes('intercepts pointer events') || combined.includes('element is not visible') || combined.includes('element is outside')) {
    return {
      category: 'HYDRATION_RACE',
      confidenceScore: 94,
      summary: `Hydration or rendering race condition: The element was detached during interaction or its pointer events were intercepted by an overlay/spinner.`,
      rootCauseDetails: `Modern single-page applications (React, Vue, Next.js) often re-render or replace DOM nodes during initial hydration or state updates. If Playwright attempts to click a node just as the framework re-mounts it, a "Element is detached from the DOM" or "another element intercepts pointer events" error occurs.`,
      suggestedFix: {
        beforeCode: `// Fragile click without waiting for hydration:\nawait page.locator('#save-btn').click();`,
        afterCode: `// Wait for loading overlay/skeleton to disappear before clicking:\nawait expect(page.locator('.loading-spinner')).toBeHidden();\n\n// Use auto-retrying action locator:\nconst saveButton = page.getByRole('button', { name: 'Save Changes' });\nawait expect(saveButton).toBeEnabled();\nawait saveButton.click();`,
        explanation: `Waiting for UI spinners to disappear and asserting that the button is enabled ensures client hydration is 100% complete before triggering pointer events.`,
      },
      preventionTips: [
        'Assert state conditions (toBeEnabled, toBeVisible) before dispatching clicks.',
        'Use page.waitForLoadState("networkidle") only if your app has deterministic network traffic.',
      ],
    };
  }

  // 4. Assertion Mismatch: expect(received).toEqual(expected)
  if (combined.includes('expect(') || combined.includes('received') || combined.includes('expected') || combined.includes('assertion')) {
    return {
      category: 'ASSERTION_REGRESSION',
      confidenceScore: 90,
      summary: `Assertion value mismatch: The application returned an actual value that did not match the expected assertion in the test specification.`,
      rootCauseDetails: `Playwright assertion expect(received).toBe(...) or toEqual(...) failed. This indicates either a genuine regression in business logic or an outdated expected value following a recent UI/copy change.`,
      suggestedFix: {
        beforeCode: `// Failing strict assertion:\nawait expect(page.getByTestId('status-label')).toHaveText('Order Placed');`,
        afterCode: `// Use soft assertions or regex pattern matching if text is dynamic:\nawait expect(page.getByTestId('status-label')).toHaveText(/Order (Placed|Processing)/i);\n\n// Or verify updated expected value against current API contract:\nawait expect(page.getByTestId('status-label')).toHaveText('Order Processing');`,
        explanation: `Updating the assertion to account for updated copywriting or dynamic status transitions restores test stability.`,
      },
      preventionTips: [
        'Inspect the Playwright trace viewer to confirm what actual value was rendered on screen.',
        'Consider using expect.soft() for non-blocking secondary UI checks.',
      ],
    };
  }

  // 5. Network / API 500 Failure
  if (combined.includes('500') || combined.includes('failed to fetch') || combined.includes('net::err') || combined.includes('connection refused')) {
    return {
      category: 'NETWORK_API_500',
      confidenceScore: 91,
      summary: `Backend or network failure: The test encountered an unhandled network error, connection refusal, or 500 Internal Server Error.`,
      rootCauseDetails: `The browser executed an API request that failed or timed out, causing the frontend to render an error boundary or hang.`,
      suggestedFix: {
        beforeCode: `// Test assumes real backend is always up:\nawait page.goto('/dashboard');`,
        afterCode: `// Mock external or unstable microservices using Playwright page.route():\nawait page.route('**/api/v1/user/profile', async (route) => {\n  await route.fulfill({\n    status: 200,\n    contentType: 'application/json',\n    body: JSON.stringify({ id: 'user-1', name: 'Test User', role: 'admin' }),\n  });\n});\nawait page.goto('/dashboard');`,
        explanation: `Mocking unstable external APIs with page.route() isolates E2E tests from backend flakiness and environment downtime.`,
      },
      preventionTips: [
        'Check server logs in the backend / CI environment for unhandled exceptions.',
        'Utilize Playwright route mocking for 3rd-party payment gateways or OAuth flows.',
      ],
    };
  }

  // 6. Generic Timeout / Fallback
  return {
    category: 'TIMEOUT_EXCEEDED',
    confidenceScore: 82,
    summary: `Execution timeout: The test exceeded its execution timeout limit (${Math.round((context.duration || 30000) / 1000)}s) before completing all actions.`,
    rootCauseDetails: `The test execution hung or encountered an unhandled promise rejection in "${context.testTitle}". Common causes include slow page loads, hanging navigation requests, or unawaited asynchronous operations.`,
    suggestedFix: {
      beforeCode: `// Default timeout may be too short for heavy end-to-end flows:\ntest('complex workflow', async ({ page }) => {\n  // ...\n});`,
      afterCode: `// Adjust specific test timeout or optimize navigation:\ntest('complex workflow', async ({ page }) => {\n  test.slow(); // Multiplies test timeout by 3x\n  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });\n});`,
      explanation: `Using test.slow() signals to Playwright that this spec performs heavy operations, preventing premature timeout cancellations.`,
    },
    preventionTips: [
      'Ensure all asynchronous Playwright commands are prefixed with await.',
      'Inspect the test video and execution trace to see the exact frame where execution stalled.',
    ],
  };
}

export default aiAnalysisService;
