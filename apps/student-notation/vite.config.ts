import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const studentNotationUiPkg = resolve(__dirname, '../../packages/student-notation-ui');
const studentNotationUiSrc = resolve(studentNotationUiPkg, 'src');
const tonePkg = dirname(require.resolve('tone/package.json'));

const normalizeBase = (value?: string) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}student-notation/` : '/';

export default defineConfig({
  base,
  plugins: [svelte()],
  resolve: {
    dedupe: ['tone', 'standardized-audio-context'],
    alias: [
      { find: /^tone$/, replacement: resolve(tonePkg, 'build/esm/index.js') },
      {
        find: /^tone\/build\/esm\/instrument\/Monophonic(?:\.js)?$/,
        replacement: resolve(tonePkg, 'build/esm/instrument/Monophonic.js'),
      },
      { find: '@state', replacement: resolve(studentNotationUiSrc, 'state') },
      { find: '@services', replacement: resolve(studentNotationUiSrc, 'services') },
      { find: '@components', replacement: resolve(studentNotationUiSrc, 'components') },
      { find: '@utils', replacement: resolve(studentNotationUiSrc, 'utils') },
      { find: '@data', replacement: resolve(studentNotationUiSrc, 'data') },
      { find: '@', replacement: studentNotationUiSrc },
      { find: '@app-types', replacement: resolve(studentNotationUiPkg, 'types') },
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/tone/') || id.includes('node_modules/standardized-audio-context/')) {
            return 'vendor-tone';
          }
          if (id.includes('node_modules/tonal/') || id.includes('node_modules/@tonaljs/')) {
            return 'vendor-tonal';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('node_modules/pitchy/')) {
            return 'vendor-pitchy';
          }
          return undefined;
        },
      },
    },
  },
});
