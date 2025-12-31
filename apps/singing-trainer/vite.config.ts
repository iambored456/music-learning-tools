import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const enableTypes = process.env.PAGES_BUILD !== 'true';

export default defineConfig({
  plugins: enableTypes
    ? [
        svelte(),
        dts({
          include: ['src/**/*.ts', 'src/**/*.svelte'],
          outDir: 'dist',
        }),
      ]
    : [svelte()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SingingTrainer',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'svelte',
        /^svelte\//,
        'tone',
        'tonal',
        'pitchy',
        /^@mlt\//,
      ],
    },
    outDir: 'dist',
    sourcemap: true,
  },
});
