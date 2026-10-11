import { defineConfig } from 'vitest/config'

// A timezone far from the app's home (Sydney) so any accidental use of the machine's local time fails a test.
process.env.TZ = 'America/Los_Angeles'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
