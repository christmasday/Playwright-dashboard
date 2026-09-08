#!/usr/bin/env node

/**
 * Monorepo Version Bumping Utility
 * Synchronizes versions across root, workspaces (frontend, backend, reporter), and .env
 *
 * Usage:
 *   node scripts/bump-version.js patch
 *   node scripts/bump-version.js minor
 *   node scripts/bump-version.js major
 *   node scripts/bump-version.js 1.2.3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetArg = process.argv[2] || 'patch';

function parseSemver(v) {
  const clean = v.replace(/^v/, '').trim();
  const parts = clean.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver string: "${v}". Must be in format X.Y.Z`);
  }
  return parts;
}

function calculateNextVersion(currentVersion, bumpType) {
  const [major, minor, patch] = parseSemver(currentVersion);

  switch (bumpType.toLowerCase()) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      // If user specified an explicit version like "1.2.0"
      parseSemver(bumpType);
      return bumpType.replace(/^v/, '').trim();
  }
}

function updateJsonVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  json.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  return true;
}

function updateEnvFile(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('VITE_APP_VERSION=')) {
    content = content.replace(/VITE_APP_VERSION=.*(\r?\n|$)/, `VITE_APP_VERSION=${newVersion}$1`);
  } else {
    content = `VITE_APP_VERSION=${newVersion}\n` + content;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

async function run() {
  const rootPkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(rootPkgPath)) {
    console.error('Error: root package.json not found.');
    process.exit(1);
  }

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  const currentVersion = rootPkg.version || '1.0.0';
  const newVersion = calculateNextVersion(currentVersion, targetArg);

  console.log(`\n📦 Bumping Playwright Dashboard version: ${currentVersion} -> ${newVersion} (${targetArg})\n`);

  const updatedFiles = [];

  // 1. Root package.json
  if (updateJsonVersion(rootPkgPath, newVersion)) {
    updatedFiles.push('package.json (root)');
  }

  // 2. Frontend package.json
  const frontendPkgPath = path.join(rootDir, 'frontend/package.json');
  if (updateJsonVersion(frontendPkgPath, newVersion)) {
    updatedFiles.push('frontend/package.json');
  }

  // 3. Backend package.json
  const backendPkgPath = path.join(rootDir, 'backend/package.json');
  if (updateJsonVersion(backendPkgPath, newVersion)) {
    updatedFiles.push('backend/package.json');
  }

  // 4. Reporter package.json
  const reporterPkgPath = path.join(rootDir, 'reporter/package.json');
  if (updateJsonVersion(reporterPkgPath, newVersion)) {
    updatedFiles.push('reporter/package.json');
  }

  // 5. Root .env
  const envPath = path.join(rootDir, '.env');
  if (updateEnvFile(envPath, newVersion)) {
    updatedFiles.push('.env (VITE_APP_VERSION)');
  }

  for (const file of updatedFiles) {
    console.log(`  ✓ Updated ${file}`);
  }

  console.log(`\n✨ Successfully updated Playwright Dashboard to v${newVersion}!\n`);
}

run().catch((err) => {
  console.error('\n❌ Version bump failed:', err.message);
  process.exit(1);
});
