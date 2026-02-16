import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type InventoryScope = 'focused' | 'monorepo';

export type ComponentCategory =
  | 'overlay'
  | 'highlight'
  | 'highway'
  | 'avatar'
  | 'controls'
  | 'visualization'
  | 'feedback'
  | 'analysis'
  | 'unknown';

export interface ComponentInventoryItem {
  id: string;
  name: string;
  file: string;
  category: ComponentCategory;
  props: string[];
  directImporters: string[];
  directImporterCount: number;
  importerScopes: string[];
  reusable: boolean;
  reusabilityNotes: string;
}

export interface ComponentInventoryReport {
  generatedAtIso: string;
  scope: InventoryScope;
  scannedFileCount: number;
  components: ComponentInventoryItem[];
}

interface GenerateComponentInventoryOptions {
  rootDir: string;
  scope?: InventoryScope;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.svelte']);
const COMPONENT_FILE_HINT = /(Overlay|Highlight|Highway|Avatar|Chooser|Control|Modal|Renderer|Canvas|Toolbar|Prompt|Wizard|Coach)/i;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'docs',
  '.svelte-kit',
  'coverage',
]);

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function toRelative(rootDir: string, filePath: string): string {
  return normalizePath(path.relative(rootDir, filePath));
}

function getScanRoots(rootDir: string, scope: InventoryScope): string[] {
  if (scope === 'monorepo') {
    return [
      path.join(rootDir, 'packages'),
      path.join(rootDir, 'apps'),
    ];
  }
  return [
    path.join(rootDir, 'packages', 'singing-trainer-core'),
    path.join(rootDir, 'packages', 'singing-trainer-ui'),
    path.join(rootDir, 'packages', 'diatonic-compass-ui'),
    path.join(rootDir, 'apps', 'singing-trainer'),
    path.join(rootDir, 'apps', 'diatonic-compass'),
  ];
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const nested = await collectSourceFiles(fullPath);
      files.push(...nested);
      continue;
    }

    const ext = path.extname(entry.name);
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveImportPath(importerPath: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const importerDir = path.dirname(importerPath);
  const base = path.resolve(importerDir, specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.svelte`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.js'),
    path.join(base, 'index.svelte'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return normalizePath(path.resolve(candidate));
    }
  }

  return normalizePath(path.resolve(base));
}

function parseImports(fileContent: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = null;
  while (true) {
    match = importRegex.exec(fileContent);
    if (!match) break;
    const specifier = match[1];
    if (!specifier) continue;
    imports.push(specifier);
  }
  return imports;
}

function getComponentCategory(relativeFilePath: string): ComponentCategory {
  const lower = relativeFilePath.toLowerCase();
  if (lower.includes('overlay')) return 'overlay';
  if (lower.includes('highlight')) return 'highlight';
  if (lower.includes('highway')) return 'highway';
  if (lower.includes('avatar')) return 'avatar';
  if (lower.includes('control') || lower.includes('chooser') || lower.includes('toolbar')) return 'controls';
  if (lower.includes('feedback') || lower.includes('result')) return 'feedback';
  if (lower.includes('analysis')) return 'analysis';
  if (lower.includes('canvas') || lower.includes('render') || lower.includes('visual')) return 'visualization';
  return 'unknown';
}

function getScopeId(relativeFilePath: string): string {
  const [root, name] = relativeFilePath.split('/');
  if (!root || !name) return 'root';
  return `${root}/${name}`;
}

function extractProps(fileContent: string): string[] {
  const props = new Set<string>();

  const propsInterfaceMatch = fileContent.match(/interface\s+Props\s*{([\s\S]*?)}/m);
  if (propsInterfaceMatch?.[1]) {
    const lines = propsInterfaceMatch[1].split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('/')) continue;
      const keyMatch = line.match(/^([a-zA-Z0-9_]+)\??\s*:/);
      if (keyMatch?.[1]) {
        props.add(keyMatch[1]);
      }
    }
  }

  const exportLetRegex = /export\s+let\s+([a-zA-Z0-9_]+)/g;
  let exportMatch: RegExpExecArray | null = null;
  while (true) {
    exportMatch = exportLetRegex.exec(fileContent);
    if (!exportMatch) break;
    if (exportMatch[1]) {
      props.add(exportMatch[1]);
    }
  }

  const runePropsMatch = fileContent.match(/let\s*{([^}]*)}\s*:\s*Props\s*=\s*\$props\(\)/m);
  if (runePropsMatch?.[1]) {
    const propsBlock = runePropsMatch[1];
    for (const segment of propsBlock.split(',')) {
      const key = segment
        .trim()
        .split(':')[0]
        ?.split('=')[0]
        ?.trim()
        .replace(/[^a-zA-Z0-9_]/g, '');
      if (key) {
        props.add(key);
      }
    }
  }

  return [...props].sort();
}

function shouldTreatAsComponent(filePath: string): boolean {
  const extension = path.extname(filePath);
  if (extension === '.svelte') return true;
  return COMPONENT_FILE_HINT.test(path.basename(filePath));
}

function getComponentName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export async function generateComponentInventoryReport(
  options: GenerateComponentInventoryOptions,
): Promise<ComponentInventoryReport> {
  const scope = options.scope ?? 'focused';
  const rootDir = path.resolve(options.rootDir);
  const scanRoots = getScanRoots(rootDir, scope);
  const sourceFiles = (
    await Promise.all(scanRoots.map((scanRoot) => collectSourceFiles(scanRoot)))
  ).flat();
  const normalizedFiles = sourceFiles.map((file) => normalizePath(path.resolve(file)));
  const fileSet = new Set(normalizedFiles);

  const importsByFile = new Map<string, string[]>();
  const reverseLocalImports = new Map<string, Set<string>>();
  const contentByFile = new Map<string, string>();

  for (const file of normalizedFiles) {
    const content = await readFile(file, 'utf8');
    contentByFile.set(file, content);
    const importSpecifiers = parseImports(content);
    importsByFile.set(file, importSpecifiers);

    for (const specifier of importSpecifiers) {
      const resolvedLocal = resolveImportPath(file, specifier);
      if (!resolvedLocal || !fileSet.has(resolvedLocal)) {
        continue;
      }
      if (!reverseLocalImports.has(resolvedLocal)) {
        reverseLocalImports.set(resolvedLocal, new Set());
      }
      reverseLocalImports.get(resolvedLocal)?.add(file);
    }
  }

  const components: ComponentInventoryItem[] = [];
  for (const file of normalizedFiles) {
    if (!shouldTreatAsComponent(file)) {
      continue;
    }

    const relativeFile = toRelative(rootDir, file);
    const importerSet = reverseLocalImports.get(file) ?? new Set<string>();
    const directImporters = [...importerSet]
      .map((importer) => toRelative(rootDir, importer))
      .sort();
    const importerScopes = [...new Set(directImporters.map(getScopeId))];
    const crossScope = importerScopes.length >= 2;
    const directImporterCount = directImporters.length;
    const reusable = crossScope || directImporterCount >= 3 || relativeFile.includes('packages/ui-components');

    let reusabilityNotes = 'Local usage only.';
    if (crossScope) {
      reusabilityNotes = 'Used across multiple package/app scopes.';
    } else if (directImporterCount >= 3) {
      reusabilityNotes = 'Imported broadly and likely reusable with light decoupling.';
    } else if (relativeFile.includes('packages/ui-components')) {
      reusabilityNotes = 'Lives in shared UI package.';
    }

    const content = contentByFile.get(file) ?? '';
    components.push({
      id: relativeFile,
      name: getComponentName(file),
      file: relativeFile,
      category: getComponentCategory(relativeFile),
      props: extractProps(content),
      directImporters,
      directImporterCount,
      importerScopes,
      reusable,
      reusabilityNotes,
    });
  }

  components.sort((a, b) => (
    b.directImporterCount - a.directImporterCount ||
    a.name.localeCompare(b.name)
  ));

  return {
    generatedAtIso: new Date().toISOString(),
    scope,
    scannedFileCount: normalizedFiles.length,
    components,
  };
}

export function formatComponentInventoryMarkdown(report: ComponentInventoryReport): string {
  const lines: string[] = [];
  const reusable = report.components.filter((item) => item.reusable);

  lines.push('# Lesson Component Inventory');
  lines.push('');
  lines.push(`- Generated: ${report.generatedAtIso}`);
  lines.push(`- Scope: ${report.scope}`);
  lines.push(`- Source files scanned: ${report.scannedFileCount}`);
  lines.push(`- Components discovered: ${report.components.length}`);
  lines.push(`- Reusable candidates: ${reusable.length}`);
  lines.push('');
  lines.push('## Top Reusable Candidates');
  lines.push('');
  lines.push('| Component | Category | Importers | Notes | Path |');
  lines.push('|---|---|---:|---|---|');

  for (const item of reusable.slice(0, 30)) {
    lines.push(`| ${item.name} | ${item.category} | ${item.directImporterCount} | ${item.reusabilityNotes} | \`${item.file}\` |`);
  }

  lines.push('');
  lines.push('## Full Inventory');
  lines.push('');

  for (const item of report.components) {
    lines.push(`### ${item.name}`);
    lines.push('');
    lines.push(`- Path: \`${item.file}\``);
    lines.push(`- Category: ${item.category}`);
    lines.push(`- Importers: ${item.directImporterCount}`);
    lines.push(`- Reusable: ${item.reusable ? 'yes' : 'no'}`);
    lines.push(`- Reusability Notes: ${item.reusabilityNotes}`);
    if (item.props.length > 0) {
      lines.push(`- Props (best-effort): ${item.props.join(', ')}`);
    } else {
      lines.push('- Props (best-effort): none detected');
    }
    if (item.directImporters.length > 0) {
      lines.push(`- Direct importers: ${item.directImporters.map((value) => `\`${value}\``).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
