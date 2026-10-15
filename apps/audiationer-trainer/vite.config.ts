import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/audiationer-trainer/` : '/',
  optimizeDeps: { exclude: ['@mlt/audiationer-trainer-ui', '@mlt/audiationer-trainer-core', '@mlt/compass-core'] },
});
