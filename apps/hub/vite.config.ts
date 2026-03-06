import { fileURLToPath, URL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const root = fileURLToPath(new URL('.', import.meta.url))
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const require = createRequire(import.meta.url)
const base =
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/')

// Resolve path aliases for student-notation-ui package
const studentNotationUiPkg = fileURLToPath(new URL('../../packages/student-notation-ui', import.meta.url))
const studentNotationUiSrc = resolve(studentNotationUiPkg, 'src')
const tonePkg = dirname(require.resolve('tone/package.json'))

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [svelte()],
  optimizeDeps: {
    exclude: [
      '@mlt/audio-samples',
      '@mlt/ui-components',
      '@mlt/student-notation-engine',
      '@mlt/student-notation-ui',
      '@mlt/singing-trainer-core',
      '@mlt/singing-trainer-ui',
      '@mlt/boomwhacker-sketchpad-ui',
      '@mlt/boomwhacker-sketchpad-core',
      '@mlt/tempo-controls-ui',
      '@mlt/diatonic-compass-ui',
      '@mlt/amateur-music-theory-ui',
      '@mlt/visual-metronome-ui',
      '@mlt/pitch-utils',
      '@mlt/pitch-data',
      '@mlt/pitch-viewport',
      '@mlt/pitch-trail',
      '@mlt/note-highway',
      '@mlt/rhythm-core',
      '@mlt/types',
      '@mlt/handoff',
      '@mlt/grand-frequency-staff-ui',
    ],
  },
  resolve: {
    dedupe: ['tone', 'standardized-audio-context'],
    alias: [
      { find: /^tone$/, replacement: resolve(tonePkg, 'build/esm/index.js') },
      {
        find: /^tone\/build\/esm\/instrument\/Monophonic(?:\.js)?$/,
        replacement: resolve(tonePkg, 'build/esm/instrument/Monophonic.js'),
      },
      // Aliases for @mlt/student-notation-ui internal imports
      { find: '@state', replacement: resolve(studentNotationUiSrc, 'state') },
      { find: '@services', replacement: resolve(studentNotationUiSrc, 'services') },
      { find: '@components', replacement: resolve(studentNotationUiSrc, 'components') },
      { find: '@utils', replacement: resolve(studentNotationUiSrc, 'utils') },
      { find: '@data', replacement: resolve(studentNotationUiSrc, 'data') },
      { find: '@', replacement: studentNotationUiSrc },
      { find: '@app-types', replacement: resolve(studentNotationUiPkg, 'types') },
    ],
  },
  build: {
    // Keep chunking simple to avoid cross-chunk initialization order issues.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        'student-notation': resolve(root, 'student-notation/index.html'),
        'boomwhacker-sketchpad': resolve(root, 'boomwhacker-sketchpad/index.html'),
        'singing-trainer': resolve(root, 'singing-trainer/index.html'),
        'diatonic-compass': resolve(root, 'diatonic-compass/index.html'),
        'amateur-music-theory': resolve(root, 'amateur-music-theory/index.html'),
        'visual-metronome': resolve(root, 'visual-metronome/index.html'),
        'grand-frequency-staff': resolve(root, 'grand-frequency-staff/index.html'),
      },
      output: {
        manualChunks(id) {
          // Split large vendor libraries into separate chunks for better caching
          if (id.includes('node_modules/tone/') || id.includes('node_modules/standardized-audio-context/')) {
            return 'vendor-tone';
          }
          if (id.includes('node_modules/tonal/') || id.includes('node_modules/@tonaljs/')) {
            return 'vendor-tonal';
          }
          if (id.includes('node_modules/html2canvas/')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('node_modules/pitchy/')) {
            return 'vendor-pitchy';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      allow: [
        fileURLToPath(new URL('../../packages', import.meta.url)),
        fileURLToPath(new URL('../../', import.meta.url)),
      ],
    },
  },
})
