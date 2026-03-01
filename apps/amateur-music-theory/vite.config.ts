import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const normalizeBase = (value?: string) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}amateur-music-theory/` : '/';

export default defineConfig({
  base,
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
