#!/usr/bin/env bash
# ==============================================================================
# Playwright Dashboard - Setup Two Repositories Remotes
# ==============================================================================
# Helper to configure git remotes for Model 2:
#   - origin:   Private Enterprise repository (EE)
#   - upstream: Public Community repository (CE)
#
# Usage:
#   ./scripts/setup-ee-repo.sh [EE_PRIVATE_GIT_URL] [CE_PUBLIC_GIT_URL]
# ==============================================================================

set -euo pipefail

EE_URL="${1:-}"
CE_URL="${2:-https://github.com/christmasday/Playwright-dashboard.git}"

echo "🔧 Configuring Two-Repository Remotes..."

if [ -z "$EE_URL" ]; then
  echo "Current git remotes:"
  git remote -v
  echo ""
  echo "Usage: ./scripts/setup-ee-repo.sh <PRIVATE_EE_URL> [PUBLIC_CE_URL]"
  echo "Example:"
  echo "  ./scripts/setup-ee-repo.sh git@github.com:christmasday/Playwright-dashboard-ee.git"
  exit 0
fi

# Set origin to EE
if git remote | grep -q "^origin$"; then
  git remote set-url origin "$EE_URL"
  echo "✅ Updated 'origin' remote -> $EE_URL"
else
  git remote add origin "$EE_URL"
  echo "✅ Added 'origin' remote -> $EE_URL"
fi

# Set upstream to CE
if git remote | grep -q "^upstream$"; then
  git remote set-url upstream "$CE_URL"
  echo "✅ Updated 'upstream' remote -> $CE_URL"
else
  git remote add upstream "$CE_URL"
  echo "✅ Added 'upstream' remote -> $CE_URL"
fi

echo ""
echo "🎉 Remotes configured successfully:"
git remote -v
