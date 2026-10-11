import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/legity-league/
export default defineConfig({
  base: '/legity-league/',
  plugins: [react()],
})
