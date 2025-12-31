/**
 * Assemble GitHub Pages output from all app builds.
 *
 * Output structure (default is dist/; override with --out or PAGES_OUTPUT_DIR):
 *   dist/ or docs/
 *   ├── index.html                 (hub)
 *   ├── assets/                    (hub assets)
 *   ├── student-notation/
 *   │   ├── index.html
 *   │   └── assets/
 *   ├── diatonic-compass/
 *   │   ├── index.html
 *   │   └── assets/
 *   └── amateur-music-theory/      (when it exists)
 *       ├── index.html
 *       └── assets/
 */

import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputArgIndex = process.argv.findIndex((arg) => arg === '--out' || arg === '--output');
const outputDirName =
  (outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null) ??
  process.env.PAGES_OUTPUT_DIR ??
  'dist';

if (!outputDirName || ['.', '..', '/', '\\'].includes(outputDirName)) {
  throw new Error(`Invalid output directory: "${outputDirName}"`);
}

const distDir = join(rootDir, outputDirName);

console.log(`Assembling GitHub Pages output to ${outputDirName}/...\n`);

// Clean dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
  console.log(`  Cleaned existing ${outputDirName}/`);
}
mkdirSync(distDir, { recursive: true });

// Copy hub to root (hub is the homepage)
const hubDist = join(rootDir, 'apps/hub/dist');
if (existsSync(hubDist)) {
  cpSync(hubDist, distDir, { recursive: true });
  console.log(`  Copied hub -> ${outputDirName}/`);
} else {
  console.warn('  Warning: apps/hub/dist not found, skipping hub');
}

// Copy student-notation to /student-notation/
const snDist = join(rootDir, 'apps/student-notation/dist');
const snDocsDir = join(rootDir, 'apps/student-notation/docs');
const snSource = existsSync(snDist) ? snDist : existsSync(snDocsDir) ? snDocsDir : null;

if (snSource) {
  const snTarget = join(distDir, 'student-notation');
  cpSync(snSource, snTarget, { recursive: true });
  console.log(`  Copied student-notation -> ${outputDirName}/student-notation/`);
} else {
  console.warn('  Warning: apps/student-notation/dist or docs not found, skipping');
}

// Copy diatonic-compass to /diatonic-compass/
const dcDist = join(rootDir, 'apps/diatonic-compass/dist');
const dcDocsDir = join(rootDir, 'apps/diatonic-compass/docs');
const dcSource = existsSync(dcDist) ? dcDist : existsSync(dcDocsDir) ? dcDocsDir : null;

if (dcSource) {
  const dcTarget = join(distDir, 'diatonic-compass');
  cpSync(dcSource, dcTarget, { recursive: true });
  console.log(`  Copied diatonic-compass -> ${outputDirName}/diatonic-compass/`);
} else {
  console.warn('  Warning: apps/diatonic-compass/dist or docs not found, skipping');
}

// Copy amateur-music-theory if it exists
const amtDist = join(rootDir, 'apps/amateur-music-theory/dist');
if (existsSync(amtDist)) {
  const amtTarget = join(distDir, 'amateur-music-theory');
  cpSync(amtDist, amtTarget, { recursive: true });
  console.log(`  Copied amateur-music-theory -> ${outputDirName}/amateur-music-theory/`);
}

console.log(`\nPages assembled in ${outputDirName}/`);

const noJekyllPath = join(distDir, '.nojekyll');
writeFileSync(noJekyllPath, '', 'utf8');
console.log(`Added ${outputDirName}/.nojekyll`);

