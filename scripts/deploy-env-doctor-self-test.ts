import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const tempDir = join(root, '.tmp', 'deploy-env-doctor-self-test')

const anonKey = fakeJwt('anon')
const serviceRoleKey = fakeJwt('service_role')

export type DeployEnvDoctorSelfTestOptions = {
  writeLine?: (line: string) => void
}

export async function runDeployEnvDoctorSelfTest(options: DeployEnvDoctorSelfTestOptions = {}) {
const writeLine = options.writeLine ?? ((line: string) => console.log(line))

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })
try {
  const validBackend = join(tempDir, 'backend.valid.env')
  const validFrontend = join(tempDir, 'frontend.valid.env')
  const invalidBackend = join(tempDir, 'backend.invalid.env')
  const invalidFrontend = join(tempDir, 'frontend.invalid.env')
  const shortKeyBackend = join(tempDir, 'backend.short-key.env')

  await writeFile(
    validBackend,
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
    validFrontend,
    [
      'VITE_API_BASE_URL=https://api.maprang.example',
      'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
      `VITE_SUPABASE_ANON_KEY=${anonKey}`,
      '',
    ].join('\n'),
  )

  await writeFile(
    invalidBackend,
    [
      'NODE_ENV=development',
      'DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE',
      'OPENROUTER_API_KEY=sk-proj-x',
      'MODEL_TEMPERATURE=3',
      'MODEL_MAX_OUTPUT_TOKENS=64',
      'MODEL_MIN_ROLEPLAY_REPLY_CHARS=soon',
      'CHAT_PROVIDER_RETRY_ATTEMPTS=0',
      'CHAT_PROVIDER_RETRY_DELAY_MS=later',
      'CREATOR_DRAFT_RETRY_ATTEMPTS=10',
      'CREATOR_DRAFT_RETRY_DELAY_MS=-1',
      'CORS_ORIGINS=http://localhost:5173',
      'ADMIN_API_KEY=short',
      'SUPABASE_URL=https://supabase.com/dashboard/project/abcdefghijklmnopqrst',
      'SUPABASE_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1',
      `SUPABASE_SERVICE_ROLE_KEY=${anonKey}`,
      'STORAGE_PROVIDER=local',
      'SUPABASE_STORAGE_BUCKET=avatars',
      'SUPABASE_STORAGE_ACCESS=public',
      'SUPABASE_SIGNED_URL_EXPIRES_IN=0',
      'IMAGE_GENERATION_API_KEY=sk-or-x',
      'IMAGE_GENERATION_LIVE_VERIFIED=0',
      '',
    ].join('\n'),
  )

  await writeFile(
    invalidFrontend,
    [
      'VITE_API_BASE_URL=http://localhost:3000',
      'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co',
      `VITE_SUPABASE_ANON_KEY=${serviceRoleKey}`,
      '',
    ].join('\n'),
  )

  await writeFile(
    shortKeyBackend,
    [
      'NODE_ENV=production',
      'DATABASE_URL=postgresql://maprang_user:very-secret-password@db.maprang.example:5432/maprang?sslmode=require',
      'OPENROUTER_API_KEY=sk-or-x',
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
      'IMAGE_GENERATION_API_KEY=sk-x',
      'IMAGE_GENERATION_LIVE_VERIFIED=1',
      '',
    ].join('\n'),
  )

  const valid = await runDoctor(validBackend, validFrontend)
  if (valid.exitCode !== 0) {
    throw new Error(`valid env ควรผ่าน deploy doctor:\n${valid.output}`)
  }

  const invalid = await runDoctor(invalidBackend, invalidFrontend)
  if (invalid.exitCode === 0) {
    throw new Error('invalid env ควรทำให้ deploy doctor ไม่ผ่าน')
  }

  const expectedMessages = [
    'ต้องเป็น production',
    'ห้ามชี้ localhost',
    'OpenAI project key',
    'ต้องเป็น https://<project-ref>.supabase.co',
    'JWT role ต้องเป็น service_role',
    'ห้ามใช้ service role key ใน frontend',
  ]
  for (const message of expectedMessages) {
    if (!invalid.output.includes(message)) {
      throw new Error(`ผลลัพธ์ invalid env ยังไม่มีข้อความที่คาดไว้: ${message}\n${invalid.output}`)
    }
  }

  const shortKey = await runDoctor(shortKeyBackend, validFrontend)
  if (shortKey.exitCode === 0) {
    throw new Error('short key env ควรทำให้ deploy doctor ไม่ผ่าน')
  }
  const expectedShortKeyMessages = ['OpenRouter key ดูสั้นผิดปกติ', 'คีย์ผู้ให้บริการสร้างรูปดูสั้นผิดปกติ']
  for (const message of expectedShortKeyMessages) {
    if (!shortKey.output.includes(message)) {
      throw new Error(`ผลลัพธ์ short key ยังไม่มีข้อความที่คาดไว้: ${message}\n${shortKey.output}`)
    }
  }

  for (const secret of [anonKey, serviceRoleKey, 'very-secret-password']) {
    if (valid.output.includes(secret) || invalid.output.includes(secret) || shortKey.output.includes(secret)) {
      throw new Error('deploy doctor output เผลอแสดง secret value')
    }
  }

  writeLine('ผ่าน - deploy env doctor self-test ผ่านแล้ว')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
}

if (import.meta.main) {
  await runDeployEnvDoctorSelfTest()
}

async function runDoctor(backendEnv: string, frontendEnv: string) {
  const proc = Bun.spawn(
    [
      process.execPath,
      'scripts/deploy-env-doctor.ts',
      '--backend-env',
      backendEnv,
      '--frontend-env',
      frontendEnv,
    ],
    {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  return {
    exitCode,
    output: `${stdout}\n${stderr}`.trim(),
  }
}

function fakeJwt(role: 'anon' | 'service_role') {
  return [base64Url({ alg: 'HS256', typ: 'JWT' }), base64Url({ role, iss: 'supabase', exp: 4102444800 }), 'signature'].join('.')
}

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}
