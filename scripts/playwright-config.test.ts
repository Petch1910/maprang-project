import { describe, expect, test } from 'bun:test'
import { buildPlaywrightWebServers, isLocalE2eUrl, playwrightSmokeTargetUrls } from '../playwright.config'

describe('Playwright e2e target config', () => {
  test('starts local backend and frontend dev servers for local defaults', () => {
    expect(playwrightSmokeTargetUrls({})).toEqual({
      frontendUrl: 'http://127.0.0.1:5173',
      backendUrl: 'http://127.0.0.1:3000',
    })

    expect(buildPlaywrightWebServers({}).map(({ command, url }) => ({ command, url }))).toEqual([
      {
        command: 'cd apps/backend && bun run dev',
        url: 'http://127.0.0.1:3000/health',
      },
      {
        command: 'cd apps/frontend && bun run dev -- --host 127.0.0.1',
        url: 'http://127.0.0.1:5173',
      },
    ])
  })

  test('does not start local dev servers for deployed staging targets', () => {
    expect(
      buildPlaywrightWebServers({
        E2E_BASE_URL: 'https://app.example.com',
        E2E_API_BASE_URL: 'https://api.example.com',
      }),
    ).toEqual([])
  })

  test('supports mixed local and deployed targets for focused debugging', () => {
    expect(
      buildPlaywrightWebServers({
        E2E_BASE_URL: 'https://app.example.com',
        E2E_API_BASE_URL: 'http://localhost:3000/',
      }).map(({ command, url }) => ({ command, url })),
    ).toEqual([
      {
        command: 'cd apps/backend && bun run dev',
        url: 'http://localhost:3000/health',
      },
    ])
  })

  test('detects loopback hosts without treating deployed domains as local', () => {
    expect(isLocalE2eUrl('http://localhost:5173')).toBe(true)
    expect(isLocalE2eUrl('http://127.0.0.1:5173')).toBe(true)
    expect(isLocalE2eUrl('http://0.0.0.0:5173')).toBe(true)
    expect(isLocalE2eUrl('http://[::1]:5173')).toBe(true)
    expect(isLocalE2eUrl('https://app.example.com')).toBe(false)
    expect(isLocalE2eUrl('not-a-url')).toBe(false)
  })
})
