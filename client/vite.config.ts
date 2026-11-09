import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site under /study-group-hub/ — keep asset URLs correct.
  base: '/study-group-hub/',
  plugins: [react(), tailwindcss()],
})
