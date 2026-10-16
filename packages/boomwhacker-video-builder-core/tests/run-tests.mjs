// Bundle source-first workspace imports, as Vite does, before running Node tests.
// This avoids loading unrelated browser/audio exports through the runtime barrel.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('tsx'))('esbuild');
const result = await esbuild.build({
  entryPoints: [fileURLToPath(new URL('./beatMap.test.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'error',
});
const directory = mkdtempSync(join(tmpdir(), 'bvb-timing-tests-'));
const output = join(directory, 'tests.mjs');
try {
  writeFileSync(output, result.outputFiles[0].text);
  await import(pathToFileURL(output).href);
} finally {
  unlinkSync(output);
  rmdirSync(directory);
}
