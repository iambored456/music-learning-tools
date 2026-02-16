import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
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
          if (id.includes('node_modules/tonal/') || id.includes('node_modules/@tonaljs/')) {
            return 'vendor-tonal';
          }
          if (id.includes('node_modules/pitchy/')) {
            return 'vendor-pitchy';
          }
          if (id.includes('/packages/student-notation-engine/') || id.includes('\\packages\\student-notation-engine\\')) {
            return 'student-notation-engine';
          }
          if (id.includes('/packages/singing-trainer-core/') || id.includes('\\packages\\singing-trainer-core\\')) {
            return 'singing-trainer-core';
          }
          if (id.includes('/packages/singing-trainer-ui/') || id.includes('\\packages\\singing-trainer-ui\\')) {
            return 'singing-trainer-ui';
          }
          return undefined;
        },
      },
    },
  },
});
