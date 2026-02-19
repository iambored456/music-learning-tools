/**
 * Assemble GitHub Pages output from hub build artifacts.
 *
 * Output structure (default is dist/; override with --out or PAGES_OUTPUT_DIR):
 *   dist/ or docs/
 *   - index.html                 (hub)
 *   - assets/                    (shared assets)
 *   - student-notation/          (from hub multi-page build)
 *   - singing-trainer/           (from hub multi-page build)
 *   - diatonic-compass/          (from hub multi-page build)
 *   - visual-metronome/          (from hub multi-page build)
 *   - amateur-music-theory/      (when it exists)
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
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

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
  console.log(`  Cleaned existing ${outputDirName}/`);
}
mkdirSync(distDir, { recursive: true });

const hubDist = join(rootDir, 'apps/hub/dist');
if (existsSync(hubDist)) {
  cpSync(hubDist, distDir, { recursive: true });
  console.log(`  Copied hub bundle (includes routed app pages) -> ${outputDirName}/`);
} else {
  console.warn('  Warning: apps/hub/dist not found, skipping hub');
}

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
