import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const pnpmCmd = 'pnpm';

const normalizeBase = (value) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const repoNameFromRemote = () => {
  try {
    const remote = execSync('git config --get remote.origin.url', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    if (!remote) return null;
    const clean = remote.replace(/\\.git$/i, '');
    const parts = clean.split(/[/:]/).filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
};

const baseFromHomepage = () => {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    const homepage = typeof pkg.homepage === 'string' ? pkg.homepage.trim() : '';
    if (!homepage) return null;
    try {
      const url = new URL(homepage);
      return normalizeBase(url.pathname);
    } catch {
      return normalizeBase(homepage);
    }
  } catch {
    return null;
  }
};

const resolveBaseUrl = () => {
  if (process.env.BASE_URL) {
    return normalizeBase(process.env.BASE_URL);
  }

  const homepageBase = baseFromHomepage();
  if (homepageBase) {
    return homepageBase;
  }

  const repoName = repoNameFromRemote() ?? basename(rootDir);
  if (repoName.endsWith('.github.io')) {
    return '/';
  }

  return normalizeBase(repoName);
};

const baseUrl = resolveBaseUrl();
console.log(`Using BASE_URL=${baseUrl}`);

const spawnOptions = {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, BASE_URL: baseUrl },
  shell: process.platform === 'win32',
};

const buildResult = spawnSync(pnpmCmd, ['run', 'build'], {
  ...spawnOptions,
  env: { ...spawnOptions.env, PAGES_BUILD: 'true' },
});

if (buildResult.error) {
  console.error(`Failed to run pnpm: ${buildResult.error.message}`);
}

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const assembleResult = spawnSync('node', ['scripts/assemble-pages.js', '--out', 'docs'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (assembleResult.error) {
  console.error(`Failed to run assemble-pages: ${assembleResult.error.message}`);
}

if (assembleResult.status !== 0) {
  process.exit(assembleResult.status ?? 1);
}
