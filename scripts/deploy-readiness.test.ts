import { describe, expect, test } from 'bun:test'
import {
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  isUnsafeCorsOrigin,
  isLocalOrigin,
  type HealthPayload,
} from './deploy-readiness'

const baseHealth: HealthPayload = {
  ok: true,
  checks: {
    databaseConfigured: true,
    databaseConnected: true,
    openRouterConfigured: true,
    imageGenerationConfigured: true,
    supabaseAuthConfigured: true,
    adminAuthConfigured: true,
  },
  security: {
    authMode: 'supabase-jwt',
    avatarStorage: 'supabase',
    avatarStorageAccess: 'signed',
    signedUrlExpiresIn: 3600,
    corsOrigins: ['https://app.example.com'],
  },
  knowledge: {
    structured: {
      ok: true,
      fileCount: 5,
      missing: [],
      errors: [],
    },
  },
  model: {
    name: 'google/gemini-2.0-flash-001',
    chatProvider: {
      configured: true,
      liveVerified: true,
      productionReady: true,
      status: 'verified',
      liveSmokeCommand: 'bun run smoke:chat',
    },
    imageGeneration: {
      configured: true,
      liveVerified: true,
      productionReady: true,
      status: 'verified',
      model: 'gpt-image-1.5',
      liveSmokeCommand: 'bun run smoke:image:live',
    },
  },
  env: {
    mode: 'production',
    missingRequired: [],
    invalid: [],
  },
}

function cloneHealth(overrides: Partial<HealthPayload> = {}): HealthPayload {
  return {
    ...baseHealth,
    ...overrides,
    checks: {
      ...baseHealth.checks,
      ...overrides.checks,
    },
    security: {
      ...baseHealth.security,
      ...overrides.security,
    },
    knowledge: {
      ...baseHealth.knowledge,
      ...overrides.knowledge,
      structured: {
        ...baseHealth.knowledge?.structured,
        ...overrides.knowledge?.structured,
      },
    },
    model: {
      ...baseHealth.model,
      ...overrides.model,
      chatProvider: {
        ...baseHealth.model?.chatProvider,
        ...overrides.model?.chatProvider,
      },
      imageGeneration: {
        ...baseHealth.model?.imageGeneration,
        ...overrides.model?.imageGeneration,
      },
    },
    env: {
      ...baseHealth.env,
      ...overrides.env,
    },
  }
}

describe('deploy readiness evaluation', () => {
  test('passes a production-ready health payload', () => {
    const readiness = evaluateDeployReadiness(baseHealth, { isLocalSmokeTarget: false })

    expect(readiness.stagingReady).toBe(true)
    expect(readiness.productionReady).toBe(true)
    expect(readiness.stagingBlockers).toEqual([])
    expect(readiness.productionBlockers).toEqual([])
    expect(buildNextDeploySteps(readiness)).toContain(
      'รัน `bun run production:check` รอบสุดท้ายกับ production backend และ frontend domains',
    )
    expect(buildNextDeploySteps(readiness)).toContain(
      'กรอก `RELEASE_HANDOFF.md` ด้วย deployed URLs, migration status, storage/auth/CORS, live smoke results, known limitations, และ go/no-go notes',
    )
  })

  test('separates staging blockers from live provider verification blockers', () => {
    const localHealth = cloneHealth({
      security: {
        corsOrigins: ['http://localhost:5173'],
      },
      model: {
        chatProvider: {
          liveVerified: false,
          productionReady: false,
          status: 'needs_live_smoke',
        },
        imageGeneration: {
          liveVerified: false,
          productionReady: false,
          status: 'needs_live_smoke',
        },
      },
    })

    const readiness = evaluateDeployReadiness(localHealth, { isLocalSmokeTarget: true })
    const nextSteps = buildNextDeploySteps(readiness)

    expect(readiness.stagingReady).toBe(false)
    expect(readiness.productionReady).toBe(false)
    expect(readiness.stagingBlockers).toEqual(['backend URL ยังเป็น local', 'CORS_ORIGINS ว่าง เป็น local หรือไม่ใช่ https'])
    expect(readiness.productionBlockers).toContain('live smoke ของ chat provider ยังไม่ได้ยืนยันผ่าน')
    expect(readiness.productionBlockers).toContain('live smoke ของ image generation ยังไม่ได้ยืนยันผ่าน')
    expect(nextSteps).toContain(
      'backend URL ยังเป็น local: ตั้ง SMOKE_API_BASE_URL และ frontend VITE_API_BASE_URL เป็น deployed backend URL',
    )
    expect(nextSteps).not.toContain(
      'live smoke ของ chat provider ยังไม่ได้ยืนยันผ่าน: รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging/production แล้วตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 หลังผ่าน',
    )
  })

  test('turns missing production hardening into staging blockers', () => {
    const incompleteHealth = cloneHealth({
      checks: {
        openRouterConfigured: false,
        imageGenerationConfigured: false,
      },
      security: {
        authMode: 'local-dev',
        avatarStorage: 'local',
        avatarStorageAccess: 'public',
        corsOrigins: [],
      },
      knowledge: {
        structured: {
          ok: false,
          fileCount: 0,
          missing: ['relationship-rules.json'],
          errors: [],
        },
      },
      env: {
        missingRequired: ['DATABASE_URL'],
        invalid: ['CORS_ORIGINS ต้องเป็น https origin ใน production'],
      },
    })

    const readiness = evaluateDeployReadiness(incompleteHealth, { isLocalSmokeTarget: false })

    expect(readiness.stagingReady).toBe(false)
    expect(readiness.stagingBlockers).toEqual(
      expect.arrayContaining([
        'auth mode ยังไม่ใช่ Supabase JWT',
        'avatar storage ยังไม่ใช่ Supabase signed URL',
        'CORS_ORIGINS ว่าง เป็น local หรือไม่ใช่ https',
        'คลังความรู้ structured ยังไม่ผ่าน',
        'OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า',
        'image generation provider ยังไม่ได้ตั้งค่า',
        'DATABASE_URL ยังไม่ได้ตั้งค่า',
        'production env ไม่ถูกต้อง: CORS_ORIGINS ต้องเป็น https origin ใน production',
      ]),
    )
  })

  test('turns production roleplay reply budget env errors into blockers', () => {
    const lowBudgetHealth = cloneHealth({
      env: {
        invalid: [
          'MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production',
        ],
      },
    })

    const readiness = evaluateDeployReadiness(lowBudgetHealth, { isLocalSmokeTarget: false })
    const nextSteps = buildNextDeploySteps(readiness)

    expect(readiness.stagingReady).toBe(false)
    expect(readiness.productionReady).toBe(false)
    expect(readiness.stagingBlockers).toEqual(
      expect.arrayContaining([
        'production env ไม่ถูกต้อง: MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production',
        'production env ไม่ถูกต้อง: MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production',
      ]),
    )
    expect(nextSteps).toContain(
      'production env ไม่ถูกต้อง: MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production: แก้ค่า backend production environment ที่ /health รายงาน',
    )
  })

  test('reports health failures before deploy gates', () => {
    const brokenHealth = cloneHealth({
      ok: false,
      checks: {
        databaseConfigured: false,
        databaseConnected: false,
      },
    })

    expect(healthFailures(brokenHealth)).toEqual([
      'backend health คืน ok=false',
      'DATABASE_URL ยังไม่ได้ตั้งค่า',
      'ฐานข้อมูลยังเชื่อมต่อไม่ได้',
    ])
  })

  test('detects local and invalid origins', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true)
    expect(isLocalOrigin('http://127.0.0.1:5173')).toBe(true)
    expect(isLocalOrigin('not-a-url')).toBe(true)
    expect(isLocalOrigin('https://app.example.com')).toBe(false)
    expect(isUnsafeCorsOrigin('http://app.example.com')).toBe(true)
    expect(isUnsafeCorsOrigin('https://localhost:5173')).toBe(true)
    expect(isUnsafeCorsOrigin('*')).toBe(true)
    expect(isUnsafeCorsOrigin('https://app.example.com')).toBe(false)
  })
})
