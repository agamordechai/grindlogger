import { defineConfig } from 'vitest/config'

// Tests run in Node against an in-memory SQLite (see src/test/fakeDb.ts); no browser, no Capacitor.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
