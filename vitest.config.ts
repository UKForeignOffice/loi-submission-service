import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['server/**/*.js', '!server/app.js', '!server/server.js'],
      thresholds: {
        lines: 41,
        functions: 58,
        branches: 14,
        statements: 41,
      },
    },
  },
})
