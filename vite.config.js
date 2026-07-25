import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Served from a subpath on the portfolio site: /demos/aqua/app/.
  base: '/demos/aqua/app/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
