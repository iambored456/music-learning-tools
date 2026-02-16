#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ALL_LESSONS, type AnyLessonTemplate, type PitchMatchingTemplate } from '@mlt/lesson-templates';
import { runLessonHeadless } from './runLessonHeadless.js';
import { listScenarioDefinitions } from './sim/scenarios.js';
import { formatTraceMarkdown } from './trace/formatMarkdown.js';
import {
  formatComponentInventoryMarkdown,
  generateComponentInventoryReport,
  type InventoryScope,
} from './report/componentInventory.js';
import {
  formatLessonUsageGraphMarkdown,
  generateLessonUsageGraphReport,
} from './report/lessonUsageGraph.js';

interface ParsedArgs {
  command: 'trace' | 'report';
  flags: Set<string>;
  values: Map<string, string[]>;
  positionals: string[];
}

interface TraceRunSpec {
  template: AnyLessonTemplate;
  variantId: string;
}

function findWorkspaceRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

function printHelp(): void {
  console.log(
    [
      'Deterministic lesson trace simulator CLI',
      '',
      'Commands:',
      '  trace   Generate execution trace files (default command).',
      '  report  Generate component inventory + lesson usage graph reports.',
      '',
      'Trace options:',
      '  --lesson <lessonId>           Run one lesson.',
      '  --variant <variantId>         Optional pitch-matching variation id/name.',
      '  --scenario <scenarioId>       Scenario id (default: deterministic-baseline).',
      '  --all                         Run all lessons and all pitch variations.',
      '  --with-report                 Also generate report files.',
      '  --set key=value               Override a lesson setting (repeatable).',
      '',
      'Report options:',
      '  --scope focused|monorepo      Scan scope (default: focused).',
      '',
      'Examples:',
      '  pnpm lesson:trace --lesson quick-pitch-match --variant warm-up --scenario pass-on-first-try',
      '  pnpm lesson:trace --all --scenario deterministic-baseline --with-report',
      '  pnpm lesson:report',
    ].join('\n'),
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  let command: 'trace' | 'report' = 'trace';
  const remaining = [...argv];
  if (remaining[0] === 'trace' || remaining[0] === 'report') {
    command = remaining.shift() as 'trace' | 'report';
  }

  const flags = new Set<string>();
  const values = new Map<string, string[]>();
  const positionals: string[] = [];

  for (let i = 0; i < remaining.length; i++) {
    const token = remaining[i];
    if (!token) continue;

    if (token.startsWith('--')) {
      const maybeEquals = token.indexOf('=');
      if (maybeEquals >= 0) {
        const key = token.slice(2, maybeEquals);
        const value = token.slice(maybeEquals + 1);
        if (!values.has(key)) values.set(key, []);
        values.get(key)?.push(value);
        continue;
      }

      const key = token.slice(2);
      const next = remaining[i + 1];
      if (next && !next.startsWith('--')) {
        if (!values.has(key)) values.set(key, []);
        values.get(key)?.push(next);
        i += 1;
      } else {
        flags.add(key);
      }
      continue;
    }

    positionals.push(token);
  }

  return { command, flags, values, positionals };
}

function getSingleValue(args: ParsedArgs, key: string): string | undefined {
  const values = args.values.get(key);
  if (!values || values.length === 0) return undefined;
  return values[values.length - 1];
}

function getAllValues(args: ParsedArgs, key: string): string[] {
  return args.values.get(key) ?? [];
}

function hasFlag(args: ParsedArgs, key: string): boolean {
  return args.flags.has(key);
}

function sanitizeForFile(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseSettingsOverrides(args: ParsedArgs): Record<string, string | number | boolean> {
  const overrides: Record<string, string | number | boolean> = {};
  for (const entry of getAllValues(args, 'set')) {
    const equalIndex = entry.indexOf('=');
    if (equalIndex <= 0) continue;
    const key = entry.slice(0, equalIndex).trim();
    const rawValue = entry.slice(equalIndex + 1).trim();
    if (!key) continue;

    if (rawValue === 'true') {
      overrides[key] = true;
      continue;
    }
    if (rawValue === 'false') {
      overrides[key] = false;
      continue;
    }
    const asNumber = Number(rawValue);
    if (Number.isFinite(asNumber)) {
      overrides[key] = asNumber;
      continue;
    }
    overrides[key] = rawValue;
  }
  return overrides;
}

function findLessonById(lessonId: string): AnyLessonTemplate | null {
  return ALL_LESSONS.find((lesson) => lesson.id === lessonId) ?? null;
}

function buildAllRunSpecs(): TraceRunSpec[] {
  const specs: TraceRunSpec[] = [];
  for (const template of ALL_LESSONS) {
    specs.push({
      template,
      variantId: 'default',
    });
    if (template.type === 'pitch-matching') {
      for (const variation of template.variations ?? []) {
        specs.push({
          template,
          variantId: variation.id,
        });
      }
    }
  }
  return specs;
}

function buildSingleRunSpec(
  lessonId: string,
  variantId: string | undefined,
): TraceRunSpec {
  const template = findLessonById(lessonId);
  if (!template) {
    throw new Error(`Lesson "${lessonId}" not found.`);
  }
  return {
    template,
    variantId: variantId ?? 'default',
  };
}

async function writeReports(rootDir: string, scope: InventoryScope): Promise<void> {
  const reportDir = path.join(rootDir, 'lesson-reports');
  await mkdir(reportDir, { recursive: true });

  const componentInventory = await generateComponentInventoryReport({
    rootDir,
    scope,
  });
  const lessonUsageGraph = generateLessonUsageGraphReport(componentInventory);

  const componentInventoryJsonPath = path.join(reportDir, 'component-inventory.json');
  const componentInventoryMdPath = path.join(reportDir, 'component-inventory.md');
  const lessonUsageJsonPath = path.join(reportDir, 'lesson-usage-graph.json');
  const lessonUsageMdPath = path.join(reportDir, 'lesson-usage-graph.md');

  await writeFile(componentInventoryJsonPath, JSON.stringify(componentInventory, null, 2), 'utf8');
  await writeFile(componentInventoryMdPath, formatComponentInventoryMarkdown(componentInventory), 'utf8');
  await writeFile(lessonUsageJsonPath, JSON.stringify(lessonUsageGraph, null, 2), 'utf8');
  await writeFile(lessonUsageMdPath, formatLessonUsageGraphMarkdown(lessonUsageGraph), 'utf8');

  console.log(`Reports written to ${path.relative(rootDir, reportDir)}`);
}

function validateScope(scopeValue: string | undefined): InventoryScope {
  if (scopeValue === 'monorepo') return 'monorepo';
  return 'focused';
}

async function runTraceCommand(args: ParsedArgs): Promise<void> {
  const rootDir = findWorkspaceRoot(process.cwd());
  const scenarioId = getSingleValue(args, 'scenario') ?? 'deterministic-baseline';
  const lessonId = getSingleValue(args, 'lesson');
  const variantId = getSingleValue(args, 'variant');
  const runAll = hasFlag(args, 'all');
  const withReport = hasFlag(args, 'with-report');
  const settingsOverride = parseSettingsOverrides(args);

  const availableScenarios = new Set(listScenarioDefinitions().map((scenario) => scenario.id));
  if (!availableScenarios.has(scenarioId)) {
    throw new Error(
      `Unknown scenario "${scenarioId}". Available: ${[...availableScenarios].join(', ')}`,
    );
  }

  if (!runAll && !lessonId) {
    throw new Error('Provide --lesson <lessonId> or use --all.');
  }

  const runSpecs = runAll
    ? buildAllRunSpecs()
    : [buildSingleRunSpec(String(lessonId), variantId)];

  const dateFolder = new Date().toISOString().slice(0, 10);
  const traceDir = path.join(rootDir, 'lesson-traces', dateFolder);
  await mkdir(traceDir, { recursive: true });

  let totalWarnings = 0;
  for (const spec of runSpecs) {
    const { trace, warnings } = runLessonHeadless({
      template: spec.template,
      scenarioId,
      variantId: spec.variantId,
      settings: settingsOverride,
    });

    const fileBase = [
      sanitizeForFile(trace.lessonId),
      sanitizeForFile(trace.variantId),
      sanitizeForFile(trace.scenarioId),
    ].join('__');
    const jsonPath = path.join(traceDir, `${fileBase}.trace.json`);
    const transcriptPath = path.join(traceDir, `${fileBase}.transcript.md`);

    await writeFile(jsonPath, JSON.stringify(trace, null, 2), 'utf8');
    await writeFile(transcriptPath, formatTraceMarkdown(trace), 'utf8');

    const relativeJsonPath = path.relative(rootDir, jsonPath);
    console.log(`Wrote trace: ${relativeJsonPath}`);
    if (warnings.length > 0) {
      totalWarnings += warnings.length;
      for (const warning of warnings) {
        console.warn(`  warning: ${warning}`);
      }
    }
  }

  console.log(`Generated ${runSpecs.length} trace run(s).`);
  if (totalWarnings > 0) {
    console.log(`Warnings: ${totalWarnings}`);
  }

  if (withReport) {
    const scope = validateScope(getSingleValue(args, 'scope'));
    await writeReports(rootDir, scope);
  }
}

async function runReportCommand(args: ParsedArgs): Promise<void> {
  const rootDir = findWorkspaceRoot(process.cwd());
  const scope = validateScope(getSingleValue(args, 'scope'));
  await writeReports(rootDir, scope);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (hasFlag(args, 'help') || hasFlag(args, 'h')) {
    printHelp();
    return;
  }

  if (args.command === 'report') {
    await runReportCommand(args);
    return;
  }

  await runTraceCommand(args);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
