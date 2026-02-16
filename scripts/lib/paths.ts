import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

export const repoRoot = resolve(currentDir, '..', '..');

export function fromRepoRoot(...segments: string[]): string {
  return resolve(repoRoot, ...segments);
}

