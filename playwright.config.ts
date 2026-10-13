import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.DPM_E2E_PORT ?? 5180)
const baseURL = process.env.DPM_E2E_BASE_URL ?? `http://127.0.0.1:${port}`
const useExternalServer = Boolean(process.env.DPM_E2E_BASE_URL)

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/e2e-artifacts',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        command: `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
