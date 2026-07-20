import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import { chromium, type Browser, type Page, type PageScreenshotOptions } from 'playwright';

import { fromRepoRoot } from './lib/paths.ts';
import { startStaticServer, type StaticServer } from './lib/staticServer.ts';

type CaptureTarget = {
  id: string;
  distDir: string;
  route?: string;
  waitFor?: string;
  postReadyWaitFor?: string;
  postReadyWaitForFunction?: string;
  postReadyScript?: string;
  theme?: 'light' | 'dark';
  omitBackground?: boolean;
  delayMs?: number;
  clip?: { x: number; y: number; width: number; height: number };
  injectCss?: string;
};

type CliOptions = {
  only: Set<string> | null;
  verbose: boolean;
  list: boolean;
  theme: 'light' | 'dark';
};

type CaptureFailure = {
  id: string;
  distDir: string;
  distExists: boolean;
  url: string;
  error: unknown;
};

const VIEWPORT = { width: 1200, height: 900 };
const DEVICE_SCALE_FACTOR = 2;
const DEFAULT_DELAY_MS = 250;
const NAVIGATION_TIMEOUT_MS = 45_000;
const SELECTOR_TIMEOUT_MS = 15_000;
const OUTPUT_DIR = fromRepoRoot('apps', 'hub', 'public', 'previews');

const TARGETS: CaptureTarget[] = [
  {
    id: 'hub',
    distDir: 'apps/hub/dist',
    route: '/',
    waitFor: '.cards .card',
    delayMs: 300,
  },
  {
    id: 'singing-trainer',
    distDir: 'apps/hub/dist',
    route: '/singing-trainer/',
    waitFor: '.app',
    delayMs: 350,
    injectCss: `
.sidebar {
  display: none !important;
}
`,
  },
  {
    id: 'student-notation',
    distDir: 'apps/hub/dist',
    route: '/student-notation/',
    waitFor: '#app-container',
    delayMs: 750,
    injectCss: `
#app-loading-screen {
  display: none !important;
}
`,
  },
  {
    id: 'amateur-music-theory',
    distDir: 'apps/hub/dist',
    route: '/amateur-music-theory/',
    waitFor: '#amateur-music-theory-app',
    delayMs: 400,
  },
  {
    id: 'simple-notation',
    distDir: 'apps/hub/dist',
    route: '/simple-notation/',
    waitFor: '#simple-notation-app',
    delayMs: 600,
    injectCss: `
.audio-gate {
  display: none !important;
}
`,
  },
  {
    id: 'boomwhacker-video-builder',
    distDir: 'apps/hub/dist',
    route: '/boomwhacker-video-builder/',
    waitFor: '.builder-shell',
    delayMs: 500,
  },
  {
    id: 'diatonic-compass',
    distDir: 'apps/hub/dist',
    route: '/diatonic-compass/',
    waitFor: '.main-container',
    postReadyWaitFor: 'body.dark-mode .main-container.vertical-layout',
    postReadyScript: `
(() => {
  try {
    localStorage.setItem(
      'diatonicCompassPreferences',
      JSON.stringify({
        darkMode: true,
        orientation: 'vertical',
        volume: 0.5,
        tutorialCompleted: false,
        showAdvancedControls: false,
        beltOrder: ['pitch', 'degree', 'intervals', 'chromatic'],
        cursorColor: 'red',
        cursorFill: false
      })
    );
  } catch {
    // ignore localStorage availability issues
  }

  const orientationVertical = document.getElementById('orientation-vertical');
  if (orientationVertical instanceof HTMLInputElement) {
    orientationVertical.checked = true;
    orientationVertical.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const themeDark = document.getElementById('theme-dark');
  if (themeDark instanceof HTMLInputElement) {
    themeDark.checked = true;
    themeDark.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const appRoot = document.getElementById('app');
  if (appRoot instanceof HTMLElement) {
    appRoot.style.width = '100vw';
    appRoot.style.height = '100vh';
    appRoot.style.display = 'block';
  }

  const mainContainer = document.querySelector('.main-container');
  if (mainContainer instanceof HTMLElement) {
    mainContainer.style.width = '100vw';
    mainContainer.style.height = '100vh';
  }

  window.dispatchEvent(new Event('resize'));
})();
`,
    theme: 'dark',
    postReadyWaitForFunction: `
(() => {
  const wheelContainer = document.querySelector('.wheel-container');
  const canvas = document.querySelector('#chromaWheel');
  if (!(wheelContainer instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return false;
  }
  const wheelRect = wheelContainer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  return wheelRect.width > 200 && wheelRect.height > 200 && canvasRect.width > 200;
})()
`,
    delayMs: 450,
    injectCss: `
:root {
  color-scheme: dark !important;
}
`,
  },
  {
    id: 'visual-metronome',
    distDir: 'apps/hub/dist',
    route: '/visual-metronome/',
    waitFor: '#page',
    postReadyScript: `
(() => {
  const orbitButton = document.querySelector('button[data-mode="orbit"]');
  if (orbitButton instanceof HTMLButtonElement) {
    orbitButton.click();
  }

  const microbeatFour = document.querySelector('#microbeats-toggle button[data-value="4"]');
  if (microbeatFour instanceof HTMLButtonElement) {
    microbeatFour.click();
  }

  const guideToggle = document.getElementById('toggle-path');
  if (guideToggle instanceof HTMLButtonElement && /show/i.test(guideToggle.textContent ?? '')) {
    guideToggle.click();
  }

  const bpmSelect = document.getElementById('bpm-select');
  if (bpmSelect instanceof HTMLSelectElement) {
    bpmSelect.value = '96';
    bpmSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
})();
`,
    postReadyWaitForFunction: `
(() => {
  const title = document.getElementById('visual-mode-title');
  return title?.textContent?.includes('Orbit Pulse') ?? false;
})()
    `,
    delayMs: 300,
  },
  {
    id: 'grand-frequency-staff',
    distDir: 'apps/hub/dist',
    route: '/grand-frequency-staff/',
    waitFor: '.app',
    delayMs: 450,
  },
];

const DETERMINISTIC_INIT_SCRIPT = `
(() => {
  // Marker apps can use to reduce runtime effects for screenshots.
  window.__SCREENSHOT__ = true;
})();
`;

function buildDeterministicCss(theme: 'light' | 'dark'): string {
  return `
:root {
  color-scheme: ${theme} !important;
}
*,
*::before,
*::after {
  animation: none !important;
  animation-delay: 0ms !important;
  animation-duration: 0ms !important;
  transition: none !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
html,
body {
  overflow: hidden !important;
}
[data-debug],
[data-debug-panel],
[data-testid*="debug" i],
[class*="debug-overlay" i],
[class*="debug-panel" i],
[id*="debug-overlay" i],
[id*="debug-panel" i],
[class*="fps" i],
[id*="fps" i],
[class*="perf" i],
[id*="perf" i],
vite-error-overlay,
#vite-error-overlay {
  visibility: hidden !important;
  display: none !important;
}
`;
}

function printUsage(): void {
  console.log(
    [
      'Usage: pnpm -w capture:previews [-- --only <id[,id...]>] [--verbose] [--list] [--theme <light|dark>]',
      '',
      'Flags:',
      '  --only <ids>    Capture only specific target IDs (comma-separated or repeated).',
      '  --verbose       Print detailed server and capture logs.',
      '  --list          Print configured targets and exit.',
      '  --theme <name>  Force a color scheme. Default: light.',
      '',
    ].join('\n'),
  );
}

function parseCliArgs(argv: string[]): CliOptions {
  const only = new Set<string>();
  let verbose = false;
  let list = false;
  let theme: 'light' | 'dark' = 'light';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--verbose') {
      verbose = true;
      continue;
    }

    if (arg === '--list') {
      list = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--only') {
      const nextArg = argv[index + 1];
      if (!nextArg) {
        throw new Error('Missing value for --only');
      }
      addOnlyValues(only, nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith('--only=')) {
      addOnlyValues(only, arg.slice('--only='.length));
      continue;
    }

    if (arg === '--theme') {
      const nextArg = argv[index + 1];
      if (!nextArg) {
        throw new Error('Missing value for --theme');
      }
      if (nextArg !== 'light' && nextArg !== 'dark') {
        throw new Error(`Invalid value for --theme: ${nextArg}`);
      }
      theme = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith('--theme=')) {
      const value = arg.slice('--theme='.length);
      if (value !== 'light' && value !== 'dark') {
        throw new Error(`Invalid value for --theme: ${value}`);
      }
      theme = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    only: only.size > 0 ? only : null,
    verbose,
    list,
    theme,
  };
}

function addOnlyValues(targetSet: Set<string>, raw: string): void {
  const values = raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  for (const value of values) {
    targetSet.add(value);
  }
}

function selectTargets(allTargets: CaptureTarget[], only: Set<string> | null): CaptureTarget[] {
  if (!only) {
    return [...allTargets];
  }

  const unknown = [...only].filter((id) => !allTargets.some((target) => target.id === id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown target id(s): ${unknown.join(', ')}. Available targets: ${allTargets.map((target) => target.id).join(', ')}`,
    );
  }

  return allTargets.filter((target) => only.has(target.id));
}

function normalizeRoute(route: string | undefined): string {
  if (!route) {
    return '/';
  }
  if (route.startsWith('/')) {
    return route;
  }
  return `/${route}`;
}

function withScreenshotFlag(baseUrl: string, route: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(route, normalizedBase);
  url.searchParams.set('screenshot', '1');
  return url.toString();
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (!('fonts' in document)) {
      return;
    }
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fontSet) {
      return;
    }
    await fontSet.ready;
  });
}

async function captureTarget(
  browser: Browser,
  target: CaptureTarget,
  options: CliOptions,
): Promise<CaptureFailure | null> {
  const resolvedDistDir = fromRepoRoot(target.distDir);
  const distExists = await directoryExists(resolvedDistDir);
  const route = normalizeRoute(target.route);
  let url = 'n/a';
  let staticServer: StaticServer | null = null;
  const activeTheme = target.theme ?? options.theme;

  if (!distExists) {
    return {
      id: target.id,
      distDir: resolvedDistDir,
      distExists: false,
      url,
      error: new Error(`Dist directory not found. Build this app first.`),
    };
  }

  let contextClosed = false;
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: activeTheme,
    reducedMotion: 'reduce',
  });

  try {
    await context.addInitScript({ content: DETERMINISTIC_INIT_SCRIPT });
    const page = await context.newPage();

    if (options.verbose) {
      page.on('pageerror', (error) => {
        const details = error.stack ?? error.message;
        console.error(`[capture-previews] pageerror (${target.id}): ${details}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          console.error(`[capture-previews] console.${message.type()} (${target.id}): ${message.text()}`);
        }
      });
    }

    staticServer = await startStaticServer({
      rootDir: resolvedDistDir,
      host: '127.0.0.1',
      verbose: options.verbose,
    });

    url = withScreenshotFlag(staticServer.url, route);

    if (options.verbose) {
      console.log(`[capture-previews] Capturing ${target.id} -> ${url}`);
    }

    await page.emulateMedia({
      colorScheme: activeTheme,
      reducedMotion: 'reduce',
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT_MS });

    if (target.waitFor) {
      await page.waitForSelector(target.waitFor, {
        timeout: SELECTOR_TIMEOUT_MS,
      });
    }

    if (target.postReadyScript) {
      await page.evaluate(target.postReadyScript);
    }

    if (target.postReadyWaitFor) {
      await page.waitForSelector(target.postReadyWaitFor, {
        timeout: SELECTOR_TIMEOUT_MS,
      });
    }

    if (target.postReadyWaitForFunction) {
      await page.waitForFunction(target.postReadyWaitForFunction, {
        timeout: SELECTOR_TIMEOUT_MS,
      });
    }

    const cssToInject = `${buildDeterministicCss(activeTheme)}\n${target.injectCss ?? ''}`;
    await page.addStyleTag({ content: cssToInject });

    await waitForFonts(page);

    const delayMs = target.delayMs ?? DEFAULT_DELAY_MS;
    if (delayMs > 0) {
      await page.waitForTimeout(delayMs);
    }

    const pngPath = resolve(OUTPUT_DIR, `${target.id}.png`);
    const screenshotOptions: PageScreenshotOptions = {
      path: pngPath,
      type: 'png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
      caret: 'hide',
      omitBackground: target.omitBackground ?? false,
    };

    if (target.clip) {
      screenshotOptions.clip = target.clip;
    }

    await page.screenshot(screenshotOptions);
    await page.close();

    if (options.verbose) {
      console.log(`[capture-previews] Wrote ${pngPath}`);
    } else {
      console.log(`[capture-previews] ${target.id} -> previews/${target.id}.png`);
    }

    return null;
  } catch (error) {
    return {
      id: target.id,
      distDir: resolvedDistDir,
      distExists,
      url,
      error,
    };
  } finally {
    if (!contextClosed) {
      await context.close().catch(() => {
        // Best effort close.
      });
      contextClosed = true;
    }

    if (staticServer) {
      await staticServer.stop().catch(() => {
        // Best effort close.
      });
    }
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const targets = selectTargets(TARGETS, options.only);

  if (options.list) {
    for (const target of targets) {
      console.log(
        `${target.id}\n  distDir: ${target.distDir}\n  route: ${target.route ?? '/'}\n  waitFor: ${target.waitFor ?? '(none)'}`,
      );
    }
    return;
  }

  if (targets.length === 0) {
    throw new Error('No capture targets selected.');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(
    `[capture-previews] Starting ${targets.length} target(s), theme=${options.theme}, viewport=${VIEWPORT.width}x${VIEWPORT.height}@${DEVICE_SCALE_FACTOR}x`,
  );

  const browser = await chromium.launch({ headless: true });
  const failures: CaptureFailure[] = [];

  try {
    for (const target of targets) {
      const failure = await captureTarget(browser, target, options);
      if (failure) {
        failures.push(failure);
        console.error(`[capture-previews] FAILED ${failure.id}`);
        console.error(`  url: ${failure.url}`);
        console.error(`  distDir: ${failure.distDir}`);
        console.error(`  distExists: ${failure.distExists}`);
        console.error(`  error: ${formatError(failure.error)}`);
        if (options.verbose && failure.error instanceof Error && failure.error.stack) {
          console.error(failure.error.stack);
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    throw new Error(`Capture failed for ${failures.length} target(s).`);
  }

  console.log('[capture-previews] Done.');
}

main().catch((error) => {
  console.error(`[capture-previews] ${formatError(error)}`);
  process.exitCode = 1;
});
