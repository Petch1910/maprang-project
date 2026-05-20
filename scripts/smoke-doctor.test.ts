import { describe, expect, test } from 'bun:test'
import { buildSmokeDoctorReport, runSmokeDoctor } from './smoke-doctor'
import type { HealthPayload } from './deploy-readiness'

function healthyPayload(overrides: Partial<HealthPayload> = {}): HealthPayload {
  return {
    ok: true,
    checks: {
      databaseConfigured: true,
      databaseConnected: true,
      openRouterConfigured: true,
      imageGenerationConfigured: true,
    },
    security: {
      authMode: 'supabase-jwt',
      avatarStorage: 'supabase',
      avatarStorageAccess: 'signed',
      signedUrlExpiresIn: 3600,
      corsOrigins: ['https://app.maprang.example'],
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
      },
      imageGeneration: {
        configured: true,
        liveVerified: true,
        productionReady: true,
        status: 'verified',
        model: 'gpt-image-1.5',
      },
    },
    ...overrides,
  }
}

describe('smoke doctor report', () => {
  test('prints next steps for local staging blockers without failing local handoff', () => {
    const report = buildSmokeDoctorReport(healthyPayload(), {
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalSmokeTarget: true,
    })

    expect(report.exitCode).toBe(0)
    expect(report.stdout).toContain('stagingReady: false')
    expect(report.stdout.join('\n')).toContain('backend URL ยังเป็น local')
    expect(report.stdout.join('\n')).toContain('รัน `bun run staging:verify`')
    expect(report.stdout.at(-1)).toBe('Smoke doctor passed.')
  })

  test('strict staging gate fails before production output when staging blockers remain', () => {
    const report = buildSmokeDoctorReport(healthyPayload(), {
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalSmokeTarget: true,
      strictStagingGate: true,
    })

    expect(report.exitCode).toBe(1)
    expect(report.stdout).toContain('stagingReady: false')
    expect(report.stdout.some((line) => line.startsWith('productionReady:'))).toBe(false)
    expect(report.stderr).toContain('Staging gate ไม่ผ่าน: แก้ staging blockers ด้านบน แล้วรันใหม่ด้วย deployed backend URL')
  })

  test('reports backend health failures with local and deploy fixes', () => {
    const report = buildSmokeDoctorReport(
      healthyPayload({
        ok: false,
        checks: {
          databaseConfigured: true,
          databaseConnected: false,
          openRouterConfigured: true,
          imageGenerationConfigured: true,
        },
      }),
      {
        apiBaseUrl: 'https://api.maprang.example',
        isLocalSmokeTarget: false,
      },
    )

    expect(report.exitCode).toBe(1)
    expect(report.stderr.join('\n')).toContain('backend health คืน ok=false')
    expect(report.stderr.join('\n')).toContain('ฐานข้อมูลยังเชื่อมต่อไม่ได้')
    expect(report.stderr.join('\n')).toContain('วิธีแก้ deploy:')
  })

  test('warns with Thai-first copy when image generation provider is missing', () => {
    const report = buildSmokeDoctorReport(
      healthyPayload({
        checks: {
          databaseConfigured: true,
          databaseConnected: true,
          openRouterConfigured: true,
          imageGenerationConfigured: false,
        },
        model: {
          name: 'google/gemini-2.0-flash-001',
          chatProvider: {
            configured: true,
            liveVerified: true,
            productionReady: true,
            status: 'verified',
          },
          imageGeneration: {
            configured: false,
            liveVerified: false,
            productionReady: false,
            status: 'missing_provider',
          },
        },
      }),
      {
        apiBaseUrl: 'https://api.maprang.example',
        isLocalSmokeTarget: false,
      },
    )

    expect(report.warnings).toContain(
      'คำเตือน: ยังไม่ได้ตั้งค่าผู้ให้บริการสร้างรูป Creator Studio จะใช้ภาพตัวอย่างชั่วคราว',
    )
  })

  test('warns when roleplay reply budget passes baseline but is below recommendation', () => {
    const report = buildSmokeDoctorReport(
      healthyPayload({
        model: {
          name: 'google/gemini-2.0-flash-001',
          maxOutputTokens: 1200,
          minRoleplayReplyChars: 320,
          chatProvider: {
            configured: true,
            liveVerified: true,
            productionReady: true,
            status: 'verified',
          },
          imageGeneration: {
            configured: true,
            liveVerified: true,
            productionReady: true,
            status: 'verified',
            model: 'gpt-image-1.5',
          },
        },
      }),
      {
        apiBaseUrl: 'https://api.maprang.example',
        isLocalSmokeTarget: false,
      },
    )

    expect(report.exitCode).toBe(0)
    expect(report.warnings).toContain(
      'Warning: roleplay reply budget is below the recommended 1600/420. Current MODEL_MAX_OUTPUT_TOKENS=1200, MODEL_MIN_ROLEPLAY_REPLY_CHARS=320.',
    )
  })

  test('does not duplicate recommendation warning when roleplay reply budget is below baseline', () => {
    const report = buildSmokeDoctorReport(
      healthyPayload({
        model: {
          name: 'google/gemini-2.0-flash-001',
          maxOutputTokens: 1199,
          minRoleplayReplyChars: 319,
          chatProvider: {
            configured: true,
            liveVerified: true,
            productionReady: true,
            status: 'verified',
          },
          imageGeneration: {
            configured: true,
            liveVerified: true,
            productionReady: true,
            status: 'verified',
            model: 'gpt-image-1.5',
          },
        },
        env: {
          invalid: [
            'MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production',
            'MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production',
          ],
        },
      }),
      {
        apiBaseUrl: 'https://api.maprang.example',
        isLocalSmokeTarget: false,
      },
    )

    expect(report.exitCode).toBe(0)
    expect(report.stdout.join('\n')).toContain(
      'production env ไม่ถูกต้อง: MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production',
    )
    expect(report.warnings.join('\n')).not.toContain('roleplay reply budget is below the recommended 1600/420')
  })

  test('validates backend root identity before health checks', async () => {
    const lines: string[] = []
    const warnings: string[] = []
    const errors: string[] = []
    let healthRead = false

    const exitCode = await runSmokeDoctor({
      argv: ['bun', 'scripts/smoke-doctor.ts'],
      apiBaseUrl: 'https://api.maprang.example',
      isLocalSmokeTarget: false,
      rootIdentityReader: async () => ({ ok: true, service: 'static-frontend' }),
      healthReader: async () => {
        healthRead = true
        return healthyPayload()
      },
      writeLine: (line) => lines.push(line),
      writeWarning: (line) => warnings.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(healthRead).toBe(false)
    expect(lines).toEqual([])
    expect(warnings).toEqual([])
    expect(errors.join('\n')).toContain('service name ไม่ถูกต้อง')
    expect(errors.join('\n')).toContain('backend root ที่ deploy ไม่ใช่ frontend/static proxy')
  })

  test('runs smoke doctor through an importable runner', async () => {
    const lines: string[] = []
    const warnings: string[] = []
    const errors: string[] = []

    const exitCode = await runSmokeDoctor({
      argv: ['bun', 'scripts/smoke-doctor.ts'],
      apiBaseUrl: 'https://api.maprang.example',
      isLocalSmokeTarget: false,
      rootIdentityReader: async () => ({ ok: true, service: 'maprang-backend' }),
      healthReader: async () => healthyPayload(),
      writeLine: (line) => lines.push(line),
      writeWarning: (line) => warnings.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(0)
    expect(lines).toContain('productionReady: true')
    expect(lines.at(-1)).toBe('Smoke doctor passed.')
    expect(warnings).toEqual([])
    expect(errors).toEqual([])
  })
})
