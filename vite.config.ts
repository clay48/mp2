import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site is served from https://clay48.github.io/mp2/, so assets and
  // routes need this prefix. It must match the repository name.
  base: '/mp2/',
})
