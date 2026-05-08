import { defineConfig, devices } from '@playwright/test'

const frontendUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'
const backendUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'cd apps/backend && bun run dev',
      url: `${backendUrl}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'cd apps/frontend && bun run dev -- --host 127.0.0.1',
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1365, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
})
