import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import {
  formatDeployDoctorArea,
  formatDeployDoctorStatus,
  formatDeployEnvDoctorError,
  hasRealValue,
  jwtRole,
  normalizeUrl,
  parseArgs,
  readEnvFile,
  runDeployEnvDoctor,
} from './deploy-env-doctor'
import { runDeployEnvDoctorSelfTest } from './deploy-env-doctor-self-test'

const tempDir = join(import.meta.dir, '..', '.tmp', 'deploy-env-doctor-unit')

describe('deploy env doctor helpers', () => {
  test('formats deploy doctor statuses in Thai', () => {
    expect(formatDeployDoctorStatus('pass')).toBe('ผ่าน')
    expect(formatDeployDoctorStatus('warn')).toBe('เตือน')
    expect(formatDeployDoctorStatus('fail')).toBe('ไม่ผ่าน')
  })

  test('formats deploy doctor areas in Thai', () => {
    expect(formatDeployDoctorArea('backend')).toBe('ระบบหลังบ้าน')
    expect(formatDeployDoctorArea('frontend')).toBe('หน้าบ้าน')
    expect(formatDeployDoctorArea('cross-check')).toBe('ตรวจเทียบสองฝั่ง')
  })

  test('parses flags and key value arguments without running the doctor', () => {
    const args = parseArgs(['--backend-env', 'backend.env', '--allow-unverified-image', '--frontend-env', 'frontend.env'])

    expect(args.get('backend-env')).toBe('backend.env')
    expect(args.get('frontend-env')).toBe('frontend.env')
    expect(args.get('allow-unverified-image')).toBe('1')
  })

  test('loads env files with comments, exports, and quoted values', async () => {
    await rm(tempDir, { recursive: true, force: true })
    await mkdir(tempDir, { recursive: true })
    const envPath = join(tempDir, 'sample.env')

    try {
      await writeFile(
        envPath,
        [
          '# comment',
          'export NODE_ENV=production',
          'CORS_ORIGINS="https://app.maprang.example"',
          "SUPABASE_STORAGE_BUCKET='avatars'",
          'EMPTY=',
          '',
        ].join('\n'),
      )

      const env = await readEnvFile(envPath)
      expect(env.get('NODE_ENV')).toBe('production')
      expect(env.get('CORS_ORIGINS')).toBe('https://app.maprang.example')
      expect(env.get('SUPABASE_STORAGE_BUCKET')).toBe('avatars')
      expect(env.get('EMPTY')).toBe('')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test('redacts secret-shaped values from env file read errors', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatDeployEnvDoctorError(new Error(`read failed for DATABASE_URL=${fakeDatabaseUrl}`))

    expect(message).toContain('[REDACTED_SECRET]')
    expect(message).not.toContain('super-secret')
  })

  test('formats object-shaped env doctor errors without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:env-object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatDeployEnvDoctorError({
      message: `read failed ${fakeDatabaseUrl}`,
      toString() {
        throw new Error('raw object should not be stringified')
      },
    })

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('env-object-secret')
    expect(formatDeployEnvDoctorError({ error: 'frontend env failed' })).toBe('frontend env failed')
    expect(formatDeployEnvDoctorError({ code: 'ENOENT' })).toBe('ไม่ทราบสาเหตุ')
  })

  test('detects placeholder values and normalizes production URLs', () => {
    expect(hasRealValue('postgresql://USER:PASSWORD@HOST:5432/DATABASE')).toBe(false)
    expect(hasRealValue('replace-with-long-random-admin-key')).toBe(false)
    expect(hasRealValue('https://api.maprang.example/')).toBe(true)
    expect(normalizeUrl('https://api.maprang.example///')).toBe('https://api.maprang.example')
    expect(normalizeUrl('not a url')).toBeNull()
  })

  test('reads Supabase JWT roles without leaking or requiring valid signatures', () => {
    expect(jwtRole(fakeJwt('anon'))).toBe('anon')
    expect(jwtRole(fakeJwt('service_role'))).toBe('service_role')
    expect(jwtRole('not-a-jwt')).toBeNull()
  })

  test('runs the full doctor through an importable function without exiting', async () => {
    const runnerDir = join(tempDir, 'runner')
    await rm(runnerDir, { recursive: true, force: true })
    await mkdir(runnerDir, { recursive: true })

    const anonKey = fakeJwt('anon')
    const serviceRoleKey = fakeJwt('service_role')
    const backendEnv = join(runnerDir, 'backend.env')
    const frontendEnv = join(runnerDir, 'frontend.env')

    try {
      await writeFile(
        backendEnv,
        [
          'NODE_ENV=production',
          'DATABASE_URL=postgresql://maprang_user:very-secret-password@db.maprang.example:5432/maprang?sslmode=require',
          'OPENROUTER_API_KEY=sk-or-test-key-1234567890',
          'MODEL_TEMPERATURE=0.85',
          'MODEL_MAX_OUTPUT_TOKENS=1600',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=420',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CHAT_PROVIDER_RETRY_DELAY_MS=350',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CREATOR_DRAFT_RETRY_DELAY_MS=350',
          'CORS_ORIGINS=https://app.maprang.example',
          'ADMIN_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          'SUPABASE_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1',
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=sk-test-image-key-1234567890',
          'IMAGE_GENERATION_LIVE_VERIFIED=1',
          '',
        ].join('\n'),
      )
      await writeFile(
        frontendEnv,
        [
          'VITE_API_BASE_URL=https://api.maprang.example',
          'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          `VITE_SUPABASE_ANON_KEY=${anonKey}`,
          '',
        ].join('\n'),
      )

      const lines: string[] = []
      const result = await runDeployEnvDoctor(['--backend-env', backendEnv, '--frontend-env', frontendEnv], (line) => lines.push(line))

      expect(result.ok).toBe(true)
      expect(result.fail).toBe(0)
      expect(result.findings.some((finding) => finding.area === 'cross-check' && finding.check === 'Supabase URL match' && finding.status === 'pass')).toBe(true)
      expect(lines[0]).toBe('ตรวจ env ก่อน deploy')
      expect(lines.join('\n')).toContain('ไฟล์ env ระบบหลังบ้าน:')
      expect(lines.join('\n')).toContain('ไฟล์ env หน้าบ้าน:')
      expect(lines.join('\n')).toContain('ผ่าน - ระบบหลังบ้าน')
      expect(lines.join('\n')).toContain('ตั้งค่า origin ของหน้าบ้านแล้ว')
      expect(lines.join('\n')).toContain('ผ่าน -')
      expect(lines.join('\n')).not.toContain('Deploy env doctor')
      expect(lines.join('\n')).not.toContain('backendEnv:')
      expect(lines.join('\n')).not.toContain('frontendEnv:')
      expect(lines.join('\n')).not.toContain('ตั้งค่า frontend origin แล้ว')
      expect(lines.join('\n')).not.toContain('PASS -')
      expect(lines.join('\n')).not.toContain(anonKey)
      expect(lines.join('\n')).not.toContain(serviceRoleKey)
    } finally {
      await rm(runnerDir, { recursive: true, force: true })
    }
  })

  test('fails production env when database or cors uses loopback hosts or origin paths', async () => {
    const runnerDir = join(tempDir, 'loopback-hosts')
    await rm(runnerDir, { recursive: true, force: true })
    await mkdir(runnerDir, { recursive: true })

    const anonKey = fakeJwt('anon')
    const serviceRoleKey = fakeJwt('service_role')
    const backendEnv = join(runnerDir, 'backend.env')
    const frontendEnv = join(runnerDir, 'frontend.env')

    try {
      await writeFile(
        backendEnv,
        [
          'NODE_ENV=production',
          'DATABASE_URL=postgresql://maprang_user:very-secret-password@0.0.0.0:5432/maprang?sslmode=require',
          'OPENROUTER_API_KEY=sk-or-test-key-1234567890',
          'MODEL_TEMPERATURE=0.85',
          'MODEL_MAX_OUTPUT_TOKENS=1600',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=420',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CHAT_PROVIDER_RETRY_DELAY_MS=350',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CREATOR_DRAFT_RETRY_DELAY_MS=350',
          'CORS_ORIGINS=https://[::1]:5173,https://cors-user:cors-pass@app.maprang.example,https://app.maprang.example/app?from=deploy',
          'ADMIN_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          'SUPABASE_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1',
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=sk-test-image-key-1234567890',
          'IMAGE_GENERATION_LIVE_VERIFIED=1',
          '',
        ].join('\n'),
      )
      await writeFile(
        frontendEnv,
        [
          'VITE_API_BASE_URL=https://api.maprang.example',
          'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          `VITE_SUPABASE_ANON_KEY=${anonKey}`,
          '',
        ].join('\n'),
      )

      const result = await runDeployEnvDoctor(['--backend-env', backendEnv, '--frontend-env', frontendEnv], () => undefined)

      expect(result.ok).toBe(false)
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'DATABASE_URL',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'CORS_ORIGINS',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'CORS_ORIGINS',
          detail: 'ต้องเป็น origin เท่านั้น ห้ามมี path/query/hash',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'CORS_ORIGINS',
          detail: 'ต้องเป็น origin เท่านั้น ห้ามมี credential/userinfo',
        }),
      )
    } finally {
      await rm(runnerDir, { recursive: true, force: true })
    }
  })

  test('fails production env when deployed URLs hide credentials or Supabase paths', async () => {
    const runnerDir = join(tempDir, 'credential-urls')
    await rm(runnerDir, { recursive: true, force: true })
    await mkdir(runnerDir, { recursive: true })

    const anonKey = fakeJwt('anon')
    const serviceRoleKey = fakeJwt('service_role')
    const backendEnv = join(runnerDir, 'backend.env')
    const frontendEnv = join(runnerDir, 'frontend.env')

    try {
      await writeFile(
        backendEnv,
        [
          'NODE_ENV=production',
          'DATABASE_URL=postgresql://maprang_user:very-secret-password@db.maprang.example:5432/maprang?sslmode=require',
          'OPENROUTER_API_KEY=sk-or-test-key-1234567890',
          'MODEL_TEMPERATURE=0.85',
          'MODEL_MAX_OUTPUT_TOKENS=1600',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=420',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CHAT_PROVIDER_RETRY_DELAY_MS=350',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CREATOR_DRAFT_RETRY_DELAY_MS=350',
          'CORS_ORIGINS=https://app.maprang.example',
          'ADMIN_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'SUPABASE_URL=https://ops-user:ops-pass@abcdefghijklmnopqrst.supabase.co',
          'SUPABASE_JWT_ISSUER=https://ops-user:ops-pass@abcdefghijklmnopqrst.supabase.co/auth/v1',
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=sk-test-image-key-1234567890',
          'IMAGE_GENERATION_LIVE_VERIFIED=1',
          '',
        ].join('\n'),
      )
      await writeFile(
        frontendEnv,
        [
          'VITE_API_BASE_URL=https://frontend-user:frontend-pass@api.maprang.example',
          'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co/project?from=dashboard',
          `VITE_SUPABASE_ANON_KEY=${anonKey}`,
          '',
        ].join('\n'),
      )

      const result = await runDeployEnvDoctor(['--backend-env', backendEnv, '--frontend-env', frontendEnv], () => undefined)

      expect(result.ok).toBe(false)
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'SUPABASE_URL',
          detail: 'ห้ามมี credential/userinfo ใน URL',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'frontend',
          status: 'fail',
          check: 'VITE_API_BASE_URL',
          detail: 'production URL ห้ามมี credential/userinfo',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'frontend',
          status: 'fail',
          check: 'VITE_SUPABASE_URL',
          detail: 'ต้องเป็น project API origin เท่านั้น ห้ามมี path/query/hash',
        }),
      )
    } finally {
      await rm(runnerDir, { recursive: true, force: true })
    }
  })

  test('fails production env when roleplay reply budget is below baseline', async () => {
    const runnerDir = join(tempDir, 'low-reply-budget')
    await rm(runnerDir, { recursive: true, force: true })
    await mkdir(runnerDir, { recursive: true })

    const anonKey = fakeJwt('anon')
    const serviceRoleKey = fakeJwt('service_role')
    const backendEnv = join(runnerDir, 'backend.env')
    const frontendEnv = join(runnerDir, 'frontend.env')

    try {
      await writeFile(
        backendEnv,
        [
          'NODE_ENV=production',
          'DATABASE_URL=postgresql://maprang_user:very-secret-password@db.maprang.example:5432/maprang?sslmode=require',
          'OPENROUTER_API_KEY=sk-or-test-key-1234567890',
          'MODEL_TEMPERATURE=0.85',
          'MODEL_MAX_OUTPUT_TOKENS=1199',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=319',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CHAT_PROVIDER_RETRY_DELAY_MS=350',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CREATOR_DRAFT_RETRY_DELAY_MS=350',
          'CORS_ORIGINS=https://app.maprang.example',
          'ADMIN_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          'SUPABASE_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1',
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=sk-test-image-key-1234567890',
          'IMAGE_GENERATION_LIVE_VERIFIED=1',
          '',
        ].join('\n'),
      )
      await writeFile(
        frontendEnv,
        [
          'VITE_API_BASE_URL=https://api.maprang.example',
          'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          `VITE_SUPABASE_ANON_KEY=${anonKey}`,
          '',
        ].join('\n'),
      )

      const lines: string[] = []
      const result = await runDeployEnvDoctor(['--backend-env', backendEnv, '--frontend-env', frontendEnv], (line) => lines.push(line))

      expect(result.ok).toBe(false)
      expect(result.fail).toBeGreaterThanOrEqual(2)
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'MODEL_MAX_OUTPUT_TOKENS',
          detail: 'ควรตั้งอย่างน้อย 1200 สำหรับคำตอบ roleplay ใน production',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'fail',
          check: 'MODEL_MIN_ROLEPLAY_REPLY_CHARS',
          detail: 'ควรตั้งอย่างน้อย 320 สำหรับคำตอบ roleplay ใน production',
        }),
      )
      expect(lines.join('\n')).not.toContain(anonKey)
      expect(lines.join('\n')).not.toContain(serviceRoleKey)
    } finally {
      await rm(runnerDir, { recursive: true, force: true })
    }
  })

  test('warns when production env uses baseline roleplay reply budget below richer recommendation', async () => {
    const runnerDir = join(tempDir, 'baseline-reply-budget')
    await rm(runnerDir, { recursive: true, force: true })
    await mkdir(runnerDir, { recursive: true })

    const anonKey = fakeJwt('anon')
    const serviceRoleKey = fakeJwt('service_role')
    const backendEnv = join(runnerDir, 'backend.env')
    const frontendEnv = join(runnerDir, 'frontend.env')

    try {
      await writeFile(
        backendEnv,
        [
          'NODE_ENV=production',
          'DATABASE_URL=postgresql://maprang_user:very-secret-password@db.maprang.example:5432/maprang?sslmode=require',
          'OPENROUTER_API_KEY=sk-or-test-key-1234567890',
          'MODEL_TEMPERATURE=0.85',
          'MODEL_MAX_OUTPUT_TOKENS=1200',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=320',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CHAT_PROVIDER_RETRY_DELAY_MS=350',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CREATOR_DRAFT_RETRY_DELAY_MS=350',
          'CORS_ORIGINS=https://app.maprang.example',
          'ADMIN_API_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          'SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          'SUPABASE_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1',
          `SUPABASE_ANON_KEY=${anonKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=sk-test-image-key-1234567890',
          'IMAGE_GENERATION_LIVE_VERIFIED=1',
          '',
        ].join('\n'),
      )
      await writeFile(
        frontendEnv,
        [
          'VITE_API_BASE_URL=https://api.maprang.example',
          'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
          `VITE_SUPABASE_ANON_KEY=${anonKey}`,
          '',
        ].join('\n'),
      )

      const result = await runDeployEnvDoctor(['--backend-env', backendEnv, '--frontend-env', frontendEnv], () => undefined)

      expect(result.ok).toBe(true)
      expect(result.warn).toBeGreaterThanOrEqual(2)
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'warn',
          check: 'MODEL_MAX_OUTPUT_TOKENS',
          detail: 'ผ่าน baseline production 1200 แล้ว แต่แนะนำ 1600 เพื่อให้ roleplay ตอบได้มีมิติมากขึ้น',
        }),
      )
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          area: 'backend',
          status: 'warn',
          check: 'MODEL_MIN_ROLEPLAY_REPLY_CHARS',
          detail: 'ผ่าน baseline production 320 แล้ว แต่แนะนำ 420 เพื่อให้ roleplay ตอบได้มีมิติมากขึ้น',
        }),
      )
    } finally {
      await rm(runnerDir, { recursive: true, force: true })
    }
  })

  test('imports the deploy doctor self-test without executing it', () => {
    expect(typeof runDeployEnvDoctorSelfTest).toBe('function')
  })
})

function fakeJwt(role: 'anon' | 'service_role') {
  return [base64Url({ alg: 'HS256', typ: 'JWT' }), base64Url({ role, iss: 'supabase', exp: 4102444800 }), 'signature'].join('.')
}

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}
