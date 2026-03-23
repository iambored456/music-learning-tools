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

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}boomwhacker-video-builder/` : '/';
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const packagesRoot = fileURLToPath(new URL('../../packages', import.meta.url));

export default defineConfig({
  base,
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    fs: {
      allow: [packagesRoot, repoRoot],
    },
  },
});
