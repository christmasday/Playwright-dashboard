/**
 * Issue Sync Service
 * Integrates with Jira Cloud & GitHub Issues REST APIs for 1-click issue creation and status synchronization.
 */

import { IntegrationConfig, IssueLink } from '../models/issueSync.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export const issueSyncService = {
  /**
   * Formats Markdown issue description for GitHub
   */
  formatGitHubIssueMarkdown: ({ testRun, build, aiAnalysis, options = {} }) => {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const testUrl = `${frontendUrl}/tests/${testRun.id}`;
    const buildUrl = build ? `${frontendUrl}/builds/${build.id}` : null;

    const sections = [];

    // Header & Metadata
    sections.push(`### 🧪 Playwright Test Failure Report`);
    sections.push(`| Field | Value |`);
    sections.push(`| :--- | :--- |`);
    sections.push(`| **Test Spec** | \`${testRun.file || 'N/A'}\` |`);
    sections.push(`| **Test Name** | ${testRun.title || testRun.name} |`);
    sections.push(`| **Status** | \`${testRun.status?.toUpperCase() || 'FAILED'}\` |`);
    sections.push(`| **Duration** | ${testRun.duration || 0}ms |`);
    if (build) {
      sections.push(`| **Branch** | \`${build.branch || 'main'}\` |`);
      sections.push(`| **Commit** | \`${build.commit_hash?.substring(0, 7) || 'N/A'}\` ${build.commit_message ? `- ${build.commit_message}` : ''} |`);
      sections.push(`| **Environment** | ${build.environment || 'ci'} |`);
    }

    // AI Root Cause Diagnosis
    if (aiAnalysis && options.includeAi !== false) {
      sections.push(`\n### 🧠 AI Root Cause & Fix Suggestions`);
      sections.push(`> **Summary:** ${aiAnalysis.summary || 'N/A'}\n`);
      if (aiAnalysis.root_cause_details) {
        sections.push(`**Root Cause:** ${aiAnalysis.root_cause_details}\n`);
      }
      if (aiAnalysis.suggested_fix) {
        const fix = aiAnalysis.suggested_fix;
        sections.push(`**Suggested Fix:**`);
        if (fix.code) {
          sections.push(`\`\`\`typescript\n${fix.code}\n\`\`\``);
        }
        if (fix.explanation) {
          sections.push(`${fix.explanation}`);
        }
      }
    }

    // Failure Error Message
    if (testRun.error && options.includeError !== false) {
      sections.push(`\n### ❌ Error Message`);
      sections.push(`\`\`\`\n${testRun.error}\n\`\`\``);
    }

    // Stack Trace in Collapsible Block
    if (testRun.stack_trace || testRun.stackTrace) {
      const trace = testRun.stack_trace || testRun.stackTrace;
      sections.push(`\n<details>\n<summary><b>🔍 Error Stack Trace</b></summary>\n\n\`\`\`\n${trace}\n\`\`\`\n</details>`);
    }

    // Dashboard Links
    sections.push(`\n---`);
    sections.push(`🔗 **[Inspect in Playwright Dashboard](${testUrl})**${buildUrl ? ` · **[View Build Report](${buildUrl})**` : ''}`);

    return sections.join('\n');
  },

  /**
   * Formats Atlassian Document Format (ADF) description for Jira Cloud REST API v3
   */
  formatJiraIssueADF: ({ testRun, build, aiAnalysis, options = {} }) => {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const testUrl = `${frontendUrl}/tests/${testRun.id}`;

    const content = [];

    // Title / Intro Paragraph
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Automated test failure detected in Playwright test suite: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: testRun.title || testRun.name },
      ],
    });

    // Metadata Bullet List
    const metaItems = [
      `Spec File: ${testRun.file || 'N/A'}`,
      `Status: ${testRun.status || 'failed'} (Duration: ${testRun.duration || 0}ms)`,
    ];
    if (build) {
      metaItems.push(`Branch: ${build.branch || 'main'} | Commit: ${build.commit_hash?.substring(0, 7) || 'N/A'}`);
      metaItems.push(`Environment: ${build.environment || 'ci'}`);
    }

    content.push({
      type: 'bulletList',
      content: metaItems.map((item) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
      })),
    });

    // AI Root Cause Section
    if (aiAnalysis && options.includeAi !== false) {
      content.push({
        type: 'panel',
        attrs: { panelType: 'info' },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '🧠 AI Root Cause Diagnosis: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: aiAnalysis.summary || 'Analysis complete' },
            ],
          },
        ],
      });
    }

    // Error Message Code Block
    if (testRun.error && options.includeError !== false) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Error Details' }],
      });
      content.push({
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: testRun.error }],
      });
    }

    // Stack Trace Code Block
    const trace = testRun.stack_trace || testRun.stackTrace;
    if (trace) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Stack Trace' }],
      });
      content.push({
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: trace.substring(0, 3000) }],
      });
    }

    // Dashboard Link
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: '🔗 View Test Run in Playwright Dashboard: ' },
        {
          type: 'text',
          text: testUrl,
          marks: [{ type: 'link', attrs: { href: testUrl } }],
        },
      ],
    });

    return {
      type: 'doc',
      version: 1,
      content,
    };
  },

  /**
   * Creates an issue on GitHub via REST API
   */
  createGitHubIssue: async (config, { title, body, labels, assignees }) => {
    const owner = config.owner || config.repo_owner;
    const repo = config.repo || config.repo_name;
    const token = config.token || env.GITHUB_TOKEN;

    if (!owner || !repo) {
      throw new Error('GitHub configuration missing repository owner or repository name');
    }
    if (!token) {
      throw new Error('GitHub Personal Access Token (PAT) or GITHUB_TOKEN is required');
    }

    const payload = {
      title,
      body,
      labels: Array.isArray(labels) && labels.length > 0 ? labels : ['bug', 'playwright'],
    };
    if (Array.isArray(assignees) && assignees.length > 0) {
      payload.assignees = assignees;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Playwright-Dashboard/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GitHub API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    return {
      issueId: String(data.id),
      issueKey: `#${data.number}`,
      issueUrl: data.html_url,
      issueTitle: data.title,
      issueStatus: data.state || 'open',
    };
  },

  /**
   * Creates an issue on Jira Cloud / Server via REST API
   */
  createJiraIssue: async (config, { summary, descriptionADF, issueType = 'Bug', priority = 'High', labels }) => {
    const hostUrl = (config.host_url || config.hostUrl || '').replace(/\/+$/, '');
    const email = config.email;
    const apiToken = config.api_token || config.apiToken;
    const projectKey = config.project_key || config.projectKey;

    if (!hostUrl || !projectKey) {
      throw new Error('Jira configuration missing host URL or project key');
    }
    if (!email || !apiToken) {
      throw new Error('Jira user email and API token are required');
    }

    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

    const payload = {
      fields: {
        project: { key: projectKey },
        summary,
        description: descriptionADF,
        issuetype: { name: issueType || 'Bug' },
        labels: Array.isArray(labels) && labels.length > 0 ? labels : ['playwright'],
      },
    };

    if (priority) {
      payload.fields.priority = { name: priority };
    }

    const res = await fetch(`${hostUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        Accept: 'application/json',
        'User-Agent': 'Playwright-Dashboard/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Jira API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    const issueKey = data.key;
    const issueUrl = `${hostUrl}/browse/${issueKey}`;

    return {
      issueId: String(data.id),
      issueKey,
      issueUrl,
      issueTitle: summary,
      issueStatus: 'open',
    };
  },

  /**
   * Syncs latest issue status from GitHub or Jira
   */
  syncIssueStatus: async (issueLinkId) => {
    const link = await IssueLink.findById(issueLinkId);
    if (!link) {
      throw new Error(`Issue link ${issueLinkId} not found`);
    }

    const configRecord = await IntegrationConfig.get(link.project_id, link.provider);
    if (!configRecord || !configRecord.config) {
      throw new Error(`Integration configuration for ${link.provider} not found`);
    }

    const config = configRecord.config;
    let newStatus = link.issue_status;

    if (link.provider === 'github') {
      const owner = config.owner || config.repo_owner;
      const repo = config.repo || config.repo_name;
      const token = config.token || env.GITHUB_TOKEN;
      const issueNumber = link.issue_key.replace('#', '');

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Playwright-Dashboard/1.0',
        },
      });

      if (res.ok) {
        const data = await res.json();
        newStatus = data.state; // 'open' or 'closed'
      }
    } else if (link.provider === 'jira') {
      const hostUrl = (config.host_url || config.hostUrl || '').replace(/\/+$/, '');
      const email = config.email;
      const apiToken = config.api_token || config.apiToken;
      const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

      const res = await fetch(`${hostUrl}/rest/api/3/issue/${link.issue_key}`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'User-Agent': 'Playwright-Dashboard/1.0',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const statusName = data.fields?.status?.name || 'open';
        const categoryKey = data.fields?.status?.statusCategory?.key;
        if (categoryKey === 'done') {
          newStatus = 'closed';
        } else if (categoryKey === 'indeterminate') {
          newStatus = 'in_progress';
        } else {
          newStatus = statusName.toLowerCase();
        }
      }
    }

    const updated = await IssueLink.updateStatus(issueLinkId, newStatus);
    return updated || { ...link, issue_status: newStatus };
  },

  /**
   * Tests connection to GitHub or Jira
   */
  testConnection: async (provider, config) => {
    const startTime = Date.now();

    if (provider === 'github') {
      const owner = config.owner || config.repo_owner;
      const repo = config.repo || config.repo_name;
      const token = config.token || env.GITHUB_TOKEN;

      if (!owner || !repo) {
        return { success: false, error: 'Repository owner and repository name are required' };
      }
      if (!token) {
        return { success: false, error: 'GitHub Personal Access Token is required' };
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Playwright-Dashboard/1.0',
        },
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, latencyMs, error: `GitHub returned HTTP ${res.status}: ${errText || res.statusText}` };
      }

      const data = await res.json();
      return {
        success: true,
        latencyMs,
        message: `Successfully connected to repository ${data.full_name} (${data.private ? 'Private' : 'Public'})`,
        details: { repo: data.full_name, defaultBranch: data.default_branch },
      };
    } else if (provider === 'jira') {
      const hostUrl = (config.host_url || config.hostUrl || '').replace(/\/+$/, '');
      const email = config.email;
      const apiToken = config.api_token || config.apiToken;
      const projectKey = config.project_key || config.projectKey;

      if (!hostUrl || !projectKey || !email || !apiToken) {
        return { success: false, error: 'Host URL, Project Key, Email, and API Token are all required' };
      }

      const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

      const res = await fetch(`${hostUrl}/rest/api/3/project/${projectKey}`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
          'User-Agent': 'Playwright-Dashboard/1.0',
        },
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, latencyMs, error: `Jira returned HTTP ${res.status}: ${errText || res.statusText}` };
      }

      const data = await res.json();
      return {
        success: true,
        latencyMs,
        message: `Successfully connected to Jira project "${data.name}" (${data.key})`,
        details: { project: data.name, key: data.key },
      };
    }

    return { success: false, error: `Unsupported provider: ${provider}` };
  },
};

export default issueSyncService;
