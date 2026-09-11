import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: Object.fromEntries([
      ['@', './src/'], ['@state', './src/state/'], ['@services', './src/services/'],
      ['@components', './src/components/'], ['@utils', './src/utils/'], ['@data', './src/data/']
    ].map(([alias, path]) => [alias!, fileURLToPath(new URL(path!, import.meta.url))]))
  },
  test: { environment: 'node' }
});
