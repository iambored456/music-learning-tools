import { defineConfig } from 'vite';

const normalizeBase = (value?: string) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
};

const base = process.env.BASE_URL ? `${normalizeBase(process.env.BASE_URL)}diatonic-compass/` : '/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
