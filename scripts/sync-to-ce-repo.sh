#!/usr/bin/env bash
# ==============================================================================
# Playwright Dashboard - Community Edition (CE) Sync Script
# ==============================================================================
# This script extracts the open-source core from the Enterprise Edition (EE)
# repository, strips all proprietary commercial code (ee/, gating, pricing upsells),
# swaps the plan middleware with the unmetered CE version, and prepares/pushes
# a clean commit to the public Community Edition Git repository.
#
# Usage:
#   ./scripts/sync-to-ce-repo.sh --dry-run
#   ./scripts/sync-to-ce-repo.sh --push [CE_GIT_REMOTE_URL]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DRY_RUN=false
PUSH=false
CE_REMOTE="${CE_REPO_URL:-https://github.com/christmasday/Playwright-dashboard.git}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --push)
      PUSH=true
      shift
      ;;
    *)
      if [[ "$1" =~ ^https?:// ]] || [[ "$1" =~ ^git@ ]]; then
        CE_REMOTE="$1"
      fi
      shift
      ;;
  esac
done

echo "===================================================================="
echo "🚀 Playwright Dashboard - CE Repository Sync"
echo "===================================================================="
echo "Source Repository (EE): $ROOT_DIR"
echo "Target CE Remote:       $CE_REMOTE"
echo "Mode:                   $([ "$DRY_RUN" = true ] && echo "DRY RUN (preview only)" || ([ "$PUSH" = true ] && echo "LIVE SYNC & PUSH" || echo "LOCAL PREPARATION ONLY"))"
echo "===================================================================="

mkdir -p "$ROOT_DIR/tmp"
TEMP_EXPORT_DIR=$(mktemp -d "$ROOT_DIR/tmp/ce-sync-XXXXXX")
trap 'rm -rf "$TEMP_EXPORT_DIR"' EXIT

echo "📁 1. Copying open-source files to staging directory..."
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='coverage' \
  --exclude='ee' \
  --exclude='.env' \
  --exclude='*.log' \
  --exclude='tmp' \
  "$ROOT_DIR/" "$TEMP_EXPORT_DIR/"

echo "🔧 2. Swapping commercial plan gating with open-source Community Edition..."
if [ -f "$TEMP_EXPORT_DIR/backend/src/middleware/planGating.ce.js" ]; then
  mv "$TEMP_EXPORT_DIR/backend/src/middleware/planGating.ce.js" "$TEMP_EXPORT_DIR/backend/src/middleware/planGating.js"
  echo "   ✅ Replaced backend/src/middleware/planGating.js with unmetered CE version"
fi

# Clean up enterprise-specific scripts from CE distribution
rm -f "$TEMP_EXPORT_DIR/scripts/test-gated-features.js"
rm -f "$TEMP_EXPORT_DIR/backend/src/tests/unit/planGating.test.js"
rm -rf "$TEMP_EXPORT_DIR/ee"

echo "🔍 3. Verifying CE directory boundary..."
if [ -d "$TEMP_EXPORT_DIR/ee" ]; then
  echo "❌ ERROR: Commercial directory 'ee/' detected in CE export!"
  exit 1
fi
echo "   ✅ Confirmed: Zero 'ee/' commercial files present in export"

# Count files
FILE_COUNT=$(find "$TEMP_EXPORT_DIR" -type f | wc -l | tr -d ' ')
echo "   📊 Total files in CE export: $FILE_COUNT"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "✨ DRY RUN COMPLETE:"
  echo "   - Pristine Community Edition built successfully at: $TEMP_EXPORT_DIR"
  echo "   - Enterprise folder 'ee/' was stripped."
  echo "   - Commercial gating middleware was replaced with open-source CE unmetered middleware."
  echo "   - No changes were pushed to git."
  exit 0
fi

if [ "$PUSH" = true ]; then
  echo "📤 4. Pushing Community Edition to $CE_REMOTE..."
  CLONE_DIR=$(mktemp -d "$ROOT_DIR/tmp/ce-repo-XXXXXX")
  trap 'rm -rf "$TEMP_EXPORT_DIR" "$CLONE_DIR"' EXIT

  echo "   Cloning target public repository..."
  git clone --depth 1 "$CE_REMOTE" "$CLONE_DIR"

  echo "   Syncing sanitized CE tree..."
  rsync -a --delete --exclude='.git' "$TEMP_EXPORT_DIR/" "$CLONE_DIR/"

  cd "$CLONE_DIR"
  git add -A

  if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit. Public CE repository is already up to date!"
  else
    COMMIT_MSG="chore(ce): sync Community Edition from upstream $(date +%Y-%m-%d)"
    git commit -m "$COMMIT_MSG"
    git push origin main
    echo "🎉 Successfully pushed Community Edition to $CE_REMOTE!"
  fi
else
  echo ""
  echo "💡 Local staging prepared at: $TEMP_EXPORT_DIR"
  echo "   To push to public CE repo, run: ./scripts/sync-to-ce-repo.sh --push [REMOTE_URL]"
fi
