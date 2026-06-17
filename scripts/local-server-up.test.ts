import { describe, expect, test } from 'bun:test'
import { buildLocalServerStartupPlan, parseLocalServerStartupArgs } from './local-server-up'

describe('local server startup plan', () => {
  test('builds the default local startup sequence', () => {
    const plan = buildLocalServerStartupPlan()

    expect(plan.urls).toEqual({
      backend: 'http://127.0.0.1:3001',
      frontend: 'http://127.0.0.1:5173',
    })
    expect(plan.setup.map((command) => command.label)).toEqual([
      'Start PostgreSQL',
      'Run Prisma migrations',
      'Seed local QA data',
    ])
    expect(plan.services.map((command) => command.label)).toEqual([
      'Backend local server',
      'Frontend local server',
    ])
    expect(plan.services[0].env).toMatchObject({ HOST: '127.0.0.1', PORT: '3001' })
    expect(plan.services[1].env).toMatchObject({ VITE_API_BASE_URL: 'http://127.0.0.1:3001' })
  })

  test('supports skipping one-shot setup tasks for already-running local servers', () => {
    const plan = buildLocalServerStartupPlan({
      skipDocker: true,
      skipMigrate: true,
      skipSeed: true,
    })

    expect(plan.setup).toEqual([])
    expect(plan.services).toHaveLength(2)
  })

  test('parses custom local ports and hosts', () => {
    const options = parseLocalServerStartupArgs([
      '--skip-docker',
      '--backend-host',
      '0.0.0.0',
      '--backend-port',
      '3010',
      '--frontend-host',
      '127.0.0.1',
      '--frontend-port',
      '5174',
    ])
    const plan = buildLocalServerStartupPlan(options)

    expect(options.skipDocker).toBe(true)
    expect(plan.urls.backend).toBe('http://0.0.0.0:3010')
    expect(plan.urls.frontend).toBe('http://127.0.0.1:5174')
    expect(plan.services[1].env).toMatchObject({ VITE_API_BASE_URL: 'http://0.0.0.0:3010' })
  })
})
