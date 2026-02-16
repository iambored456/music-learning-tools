import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const studentNotationUiPkg = resolve(__dirname, '../../packages/student-notation-ui');
const studentNotationUiSrc = resolve(studentNotationUiPkg, 'src');

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
    alias: {
      '@state': resolve(studentNotationUiSrc, 'state'),
      '@services': resolve(studentNotationUiSrc, 'services'),
      '@components': resolve(studentNotationUiSrc, 'components'),
      '@utils': resolve(studentNotationUiSrc, 'utils'),
      '@data': resolve(studentNotationUiSrc, 'data'),
      '@': studentNotationUiSrc,
      '@app-types': resolve(studentNotationUiPkg, 'types'),
    },
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
