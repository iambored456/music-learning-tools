import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'StudentNotationEngine',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['tone', 'tonal'],
    },
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
