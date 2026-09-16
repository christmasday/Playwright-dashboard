/**
 * Core Extension & Enterprise Loader
 * Dynamically bridges Community Edition (CE) and Enterprise Edition (EE).
 * 
 * - In Community Edition (public repo): ee/ does not exist. Middlewares operate
 *   as transparent pass-throughs with zero artificial limits or paywalls.
 * - In Enterprise Edition (private repo): ee/ exists. Real quota gating,
 *   tier verification, and member limits are enforced.
 */

import fs from 'fs';
import path from 'path';

// Locate Enterprise Edition layer robustly across root or backend cwd
const candidatePaths = [
  path.resolve(process.cwd(), 'ee/backend/middleware/planGating.js'),
  path.resolve(process.cwd(), '../ee/backend/middleware/planGating.js'),
  path.resolve(process.cwd(), '../../ee/backend/middleware/planGating.js'),
];
const EE_GATING_PATH = candidatePaths.find((p) => fs.existsSync(p));
export const hasEnterpriseEdition = Boolean(EE_GATING_PATH);

let eeModule = null;

if (hasEnterpriseEdition) {
  try {
    eeModule = await import(EE_GATING_PATH);
  } catch (err) {
    // Graceful fallback if dynamic import fails in certain test environments
  }
}

// Fallback Community Edition definitions (100% free, no artificial gating for self-hosters)
export const COMMUNITY_PLANS = {
  community: {
    name: 'Community (Open Source)',
    tier: 'community',
    maxMembers: Infinity,
    monthlyTests: Infinity,
    retentionDays: Infinity,
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

export const PLANS = eeModule?.PLANS || COMMUNITY_PLANS;
export const getActivePlan = eeModule?.getActivePlan || ((planKey) => COMMUNITY_PLANS.community);

export const requireFeature = (featureKey, requiredTier = 'business') => {
  if (eeModule?.requireFeature) {
    return eeModule.requireFeature(featureKey, requiredTier);
  }
  // Community Edition: No feature paywalls
  return (req, res, next) => next();
};

export const enforceMemberLimit = async (req, res, next) => {
  if (eeModule?.enforceMemberLimit) {
    return eeModule.enforceMemberLimit(req, res, next);
  }
  // Community Edition: Unlimited self-hosted members
  return next();
};

export default {
  hasEnterpriseEdition,
  PLANS,
  getActivePlan,
  requireFeature,
  enforceMemberLimit,
};
