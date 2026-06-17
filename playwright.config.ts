import { defineConfig, devices } from '@playwright/test'

export type PlaywrightSmokeEnv = Record<string, string | undefined>

export function playwrightSmokeTargetUrls(env: PlaywrightSmokeEnv = process.env) {
  return {
    frontendUrl: env.E2E_BASE_URL ?? 'http://127.0.0.1:5174',
    backendUrl: env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3191',
  }
}

export function isLocalE2eUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(host)
  } catch {
    return false
  }
}

function e2eUrlPort(value: string, fallback: string) {
  try {
    return new URL(value).port || fallback
  } catch {
    return fallback
  }
}

export function buildPlaywrightWebServers(env: PlaywrightSmokeEnv = process.env) {
  const { frontendUrl, backendUrl } = playwrightSmokeTargetUrls(env)
  const backendOrigin = backendUrl.replace(/\/+$/, '')
  const backendPort = e2eUrlPort(backendUrl, '3191')
  const frontendPort = e2eUrlPort(frontendUrl, '5174')
  const webServers: Array<{
    command: string
    url: string
    reuseExistingServer: boolean
    timeout: number
    env?: Record<string, string>
  }> = []

  if (isLocalE2eUrl(backendUrl)) {
    webServers.push({
      command: 'cd apps/backend && bun run dev',
      env: { PORT: backendPort },
      url: `${backendOrigin}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    })
  }

  if (isLocalE2eUrl(frontendUrl)) {
    webServers.push({
      command: `cd apps/frontend && bun run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      env: { VITE_API_BASE_URL: backendOrigin },
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    })
  }

  return webServers
}

const { frontendUrl } = playwrightSmokeTargetUrls()
const webServers = buildPlaywrightWebServers()

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
    extraHTTPHeaders: {
      'ngrok-skip-browser-warning': '69420',
    },
  },
  ...(webServers.length > 0 ? { webServer: webServers } : {}),
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
