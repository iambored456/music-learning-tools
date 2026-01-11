import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const root = fileURLToPath(new URL('.', import.meta.url))
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/')

// Resolve path aliases for student-notation-ui package
const studentNotationUiSrc = fileURLToPath(new URL('../../packages/student-notation-ui/src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [svelte()],
  optimizeDeps: {
    exclude: [
      '@mlt/ui-components',
      '@mlt/student-notation-engine',
      '@mlt/student-notation-ui',
      '@mlt/singing-trainer-ui',
      '@mlt/diatonic-compass-ui',
      '@mlt/pitch-utils',
      '@mlt/pitch-data',
      '@mlt/pitch-viewport',
      '@mlt/pitch-trail',
      '@mlt/note-highway',
      '@mlt/rhythm-core',
      '@mlt/types',
      '@mlt/handoff',
    ],
  },
  resolve: {
    alias: {
      // Aliases for @mlt/student-notation-ui internal imports
      '@state': resolve(studentNotationUiSrc, 'state'),
      '@services': resolve(studentNotationUiSrc, 'services'),
      '@components': resolve(studentNotationUiSrc, 'components'),
      '@utils': resolve(studentNotationUiSrc, 'utils'),
      '@data': resolve(studentNotationUiSrc, 'data'),
      '@': studentNotationUiSrc,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        'student-notation': resolve(root, 'student-notation/index.html'),
        'singing-trainer': resolve(root, 'singing-trainer/index.html'),
        'diatonic-compass': resolve(root, 'diatonic-compass/index.html'),
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
