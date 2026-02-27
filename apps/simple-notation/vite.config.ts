import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const normalizeBase = (value?: string) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}simple-notation/` : '/';

export default defineConfig({
  base,
  plugins: [svelte()],
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
});
