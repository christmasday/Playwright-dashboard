/**
 * Playwright Dashboard Community Edition (CE)
 * Open-Source Plan Middleware (MIT License)
 * 
 * In the Community Edition, test management, live WebSocket streams,
 * artifact storage, and reporting are 100% free and unmetered for self-hosters.
 */

export const PLANS = {
  community: {
    name: 'Community (Self-Hosted)',
    tier: 'community',
    maxMembers: Infinity,
    monthlyTests: Infinity,
    retentionDays: Infinity,
    maxArtifactSizeMb: 1024,
    features: {
      flaky_quarantine: true,
      build_compare: true,
      slack_teams_alerts: true,
      jira_linear_sync: true,
      custom_retention_rules: true,
      sso_saml: true,
      audit_logs: true,
    },
  },
};

export const getActivePlan = () => PLANS.community;
export const requireFeature = () => (req, res, next) => next();
export const enforceMemberLimit = (req, res, next) => next();

export default { PLANS, getActivePlan, requireFeature, enforceMemberLimit };
