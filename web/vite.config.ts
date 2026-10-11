import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Unique per build; the app compares it with /version.json to detect new deploys.
const buildId = process.env.GITHUB_SHA?.slice(0, 12) ?? String(Date.now())

// Served from https://<user>.github.io/legity-league/
export default defineConfig({
  base: '/legity-league/',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    react(),
    {
      name: 'emit-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) })
      },
    },
  ],
})
