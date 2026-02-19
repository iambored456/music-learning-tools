#!/usr/bin/env node

/**
 * Enforce app-shell boundaries for package-first architecture.
 *
 * Rules for apps/* except apps/hub:
 * 1. src/main.ts must exist.
 * 2. src/ must not contain any other source files.
 * 3. src/main.ts should stay lightweight (line-count budget).
 * 4. src/main.ts must not import local modules.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const appsDir = join(rootDir, 'apps');
const MAIN_PATH = 'src/main.ts';
const MAIN_LINE_BUDGET = 40;

function collectFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function getAppDirs() {
  return readdirSync(appsDir)
    .map((name) => ({ name, path: join(appsDir, name) }))
    .filter(({ path }) => statSync(path).isDirectory())
    .filter(({ name }) => name !== 'hub');
}

function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

const errors = [];

console.log('Checking app-shell boundaries...\n');

for (const app of getAppDirs()) {
  const srcDir = join(app.path, 'src');
  const mainPath = join(app.path, MAIN_PATH);
  const appHeader = `apps/${app.name}`;

  let srcFiles = [];
  try {
    srcFiles = collectFiles(srcDir);
  } catch {
    errors.push(`- ${appHeader}: missing src/ directory`);
    continue;
  }

  const relativeSrcFiles = srcFiles.map((filePath) => normalizePath(relative(app.path, filePath)));
  const extraFiles = relativeSrcFiles.filter((filePath) => filePath !== MAIN_PATH);

  if (!relativeSrcFiles.includes(MAIN_PATH)) {
    errors.push(`- ${appHeader}: missing ${MAIN_PATH}`);
  }

  if (extraFiles.length > 0) {
    errors.push(`- ${appHeader}: src/ should only contain ${MAIN_PATH}; found ${extraFiles.join(', ')}`);
  }

  let mainSource = '';
  try {
    mainSource = readFileSync(mainPath, 'utf8');
  } catch {
    errors.push(`- ${appHeader}: cannot read ${MAIN_PATH}`);
    continue;
  }

  const lineCount = mainSource.split(/\r?\n/).length;
  if (lineCount > MAIN_LINE_BUDGET) {
    errors.push(
      `- ${appHeader}: ${MAIN_PATH} has ${lineCount} lines (budget ${MAIN_LINE_BUDGET}); move logic into packages/*`,
    );
  }

  const localImportRegex = /from\s+['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]/g;
  const localImports = new Set();
  let match = localImportRegex.exec(mainSource);
  while (match) {
    const importPath = match[1] ?? match[2];
    if (importPath) {
      localImports.add(importPath);
    }
    match = localImportRegex.exec(mainSource);
  }

  if (localImports.size > 0) {
    errors.push(
      `- ${appHeader}: ${MAIN_PATH} imports local modules (${[...localImports].join(', ')}); import from @mlt/* packages instead`,
    );
  }
}

if (errors.length > 0) {
  console.error('App-shell boundary violations found:\n');
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} violation(s) found.`);
  process.exit(1);
}

console.log('All non-hub apps are thin shells (src/main.ts only).');
