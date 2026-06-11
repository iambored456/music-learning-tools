import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const normalizeBase = (value?: string) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}boomwhacker-sketchpad/` : '/';
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const packagesRoot = fileURLToPath(new URL('../../packages', import.meta.url));
const tempoControlsUiSrc = fileURLToPath(new URL('../../packages/tempo-controls-ui/src/index.ts', import.meta.url));
const audioSamplesLocalSamplesSrc = fileURLToPath(new URL('../../packages/audio-samples/src/localDrumSamples.ts', import.meta.url));

export default defineConfig({
  base,
  plugins: [svelte()],
  resolve: {
    alias: [
      { find: '@mlt/tempo-controls-ui', replacement: tempoControlsUiSrc },
      { find: '@mlt/audio-samples/local-samples', replacement: audioSamplesLocalSamplesSrc },
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

          return undefined;
        },
      },
    },
  },
  server: {
    fs: {
      allow: [packagesRoot, repoRoot],
    },
  },
});
