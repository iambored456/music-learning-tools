import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const root = fileURLToPath(new URL('.', import.meta.url))
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [svelte()],
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
      allow: [fileURLToPath(new URL('../../', import.meta.url))],
    },
  },
})
