#!/usr/bin/env node

/**
 * Dependency rule checker for package-first monorepo architecture
 *
 * Rules:
 * 1. Hub must NOT depend on apps
 * 2. Apps must NOT depend on other apps
 * 3. Apps must ONLY use simple names (no @mlt/ prefix)
 * 4. Packages must NOT depend on apps
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Recursively find all package.json files
 */
function findPackageJsonFiles(dir, results = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (file === 'node_modules' || file === 'dist' || file === '.git') {
        continue;
      }
      findPackageJsonFiles(filePath, results);
    } else if (file === 'package.json') {
      results.push(filePath);
    }
  }

  return results;
}

// App names that should NOT appear in any package.json dependencies
const APP_PACKAGE_NAMES = [
  '@mlt/singing-trainer',
  '@mlt/student-notation',
  '@mlt/diatonic-compass',
];

// Simple app names (allowed in apps/ but nowhere else)
const SIMPLE_APP_NAMES = [
  'singing-trainer',
  'student-notation',
  'diatonic-compass',
  'hub',
];

const errors = [];

/**
 * Check a single package.json file
 */
function checkPackageJson(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(content);
  const isInApps = filePath.includes('\\apps\\') || filePath.includes('/apps/');
  const isHub = filePath.includes('\\apps\\hub\\') || filePath.includes('/apps/hub/');
  const isInPackages = filePath.includes('\\packages\\') || filePath.includes('/packages/');

  // Rule 1 & 2: Check for app dependencies
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  for (const depName of Object.keys(allDeps || {})) {
    // Check for old @mlt/app-name dependencies
    if (APP_PACKAGE_NAMES.includes(depName)) {
      if (isHub) {
        errors.push(`❌ Hub (${filePath}) depends on app "${depName}". Hub should only depend on packages like @mlt/singing-trainer-ui`);
      } else if (isInApps) {
        errors.push(`❌ App (${filePath}) depends on another app "${depName}". Apps should not depend on each other.`);
      } else if (isInPackages) {
        errors.push(`❌ Package (${filePath}) depends on app "${depName}". Packages should never depend on apps.`);
      }
    }

    // Check for simple app names (which are only valid within apps themselves)
    if (SIMPLE_APP_NAMES.includes(depName) && !isInApps) {
      errors.push(`❌ Package (${filePath}) depends on "${depName}" which is an app. Packages should not depend on apps.`);
    }
  }

  // Rule 3: Check that apps use simple names (no @mlt/ prefix)
  if (isInApps && !isHub && pkg.name && pkg.name.startsWith('@mlt/')) {
    errors.push(`❌ App (${filePath}) uses @mlt/ prefix in name "${pkg.name}". Apps should use simple names like "singing-trainer".`);
  }

  // Check for exports field in apps (apps should not export as libraries)
  if (isInApps && !isHub && pkg.exports) {
    errors.push(`❌ App (${filePath}) has "exports" field. Apps should not export as libraries.`);
  }
}

/**
 * Main check function
 */
function checkDependencies() {
  console.log('🔍 Checking dependency rules...\n');

  // Find all package.json files (excluding node_modules)
  const packageJsonFiles = findPackageJsonFiles(rootDir);

  for (const file of packageJsonFiles) {
    checkPackageJson(file);
  }

  if (errors.length === 0) {
    console.log('✅ All dependency rules passed!\n');
    console.log('Rules checked:');
    console.log('  1. Hub does not depend on apps');
    console.log('  2. Apps do not depend on other apps');
    console.log('  3. Apps use simple names (no @mlt/ prefix)');
    console.log('  4. Packages do not depend on apps');
    console.log('  5. Apps do not have library exports\n');
    process.exit(0);
  } else {
    console.error('❌ Dependency rule violations found:\n');
    errors.forEach(error => console.error(error));
    console.error(`\n${errors.length} violation(s) found.\n`);
    process.exit(1);
  }
}

try {
  checkDependencies();
} catch (err) {
  console.error('Error checking dependencies:', err);
  process.exit(1);
}
