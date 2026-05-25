const requiredInProduction = [
  'DATABASE_URL',
  'OPENROUTER_API_KEY',
  'CORS_ORIGINS',
  'ADMIN_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STORAGE_PROVIDER',
  'SUPABASE_STORAGE_BUCKET',
  'SUPABASE_STORAGE_ACCESS',
  'SUPABASE_SIGNED_URL_EXPIRES_IN',
] as const

const recommendedInProduction = [
  'MODEL_INPUT_COST_PER_1M',
  'MODEL_OUTPUT_COST_PER_1M',
  'MODEL_TEMPERATURE',
  'MODEL_MAX_OUTPUT_TOKENS',
  'MODEL_MIN_ROLEPLAY_REPLY_CHARS',
  'PROMPT_BUDGET_TOKENS',
  'PROMPT_HISTORY_MAX_MESSAGES',
  'CHAT_PROVIDER_RETRY_ATTEMPTS',
  'CHAT_PROVIDER_RETRY_DELAY_MS',
  'CREATOR_DRAFT_RETRY_ATTEMPTS',
  'CREATOR_DRAFT_RETRY_DELAY_MS',
] as const

function present(name: string) {
  const value = process.env[name]?.trim()
  if (!value) return false
  const normalized = value.toLowerCase()
  const placeholderFragments = [
    'replace-with-',
    '<',
    '>',
    'your-project.supabase.co',
    'example.com',
    'postgresql://user:password@host',
    'postgres://user:password@host',
  ]
  const placeholderTokens = ['user', 'password', 'host', 'database']
  return (
    !placeholderFragments.some((fragment) => normalized.includes(fragment)) &&
    !placeholderTokens.includes(normalized)
  )
}

function csv(name: string) {
  return (
    process.env[name]
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  )
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function jwtRole(value: string) {
  if (!value.startsWith('eyJ')) return null
  const [, payload] = value.split('.')
  if (!payload) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

function invalidProductionValues() {
  if (process.env.NODE_ENV !== 'production') return []

  const invalid: string[] = []
  const corsOrigins = csv('CORS_ORIGINS')

  for (const origin of corsOrigins) {
    try {
      const url = new URL(origin)
      if (url.protocol !== 'https:') {
        invalid.push('CORS_ORIGINS ต้องเป็น https origin ใน production')
        break
      }
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname)) {
        invalid.push('CORS_ORIGINS ห้ามใส่ localhost/127.0.0.1/0.0.0.0/::1 ใน production')
        break
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        invalid.push('CORS_ORIGINS ต้องเป็น origin เท่านั้น ห้ามมี path/query/hash ใน production')
        break
      }
    } catch {
      invalid.push('CORS_ORIGINS ต้องเป็นรายการ origin ที่ถูกต้องและคั่นด้วย comma')
      break
    }
  }

  if (present('ADMIN_API_KEY') && process.env.ADMIN_API_KEY!.trim().length < 32) {
    invalid.push('ADMIN_API_KEY ต้องยาวอย่างน้อย 32 ตัวอักษร')
  }

  if (present('OPENROUTER_API_KEY') && process.env.OPENROUTER_API_KEY!.trim().startsWith('sk-proj-')) {
    invalid.push('OPENROUTER_API_KEY ดูเหมือนเป็น OpenAI project key ไม่ใช่ OpenRouter key')
  }
  if (present('OPENROUTER_API_KEY') && !process.env.OPENROUTER_API_KEY!.trim().startsWith('sk-or-')) {
    invalid.push('OPENROUTER_API_KEY ต้องเป็น OpenRouter key ที่ขึ้นต้นด้วย sk-or-')
  }
  if (present('IMAGE_GENERATION_API_KEY') && process.env.IMAGE_GENERATION_API_KEY!.trim().startsWith('sk-or-')) {
    invalid.push('IMAGE_GENERATION_API_KEY ดูเหมือนเป็น OpenRouter key ไม่ใช่ OpenAI image key')
  }
  if (present('OPENAI_API_KEY') && process.env.OPENAI_API_KEY!.trim().startsWith('sk-or-')) {
    invalid.push('OPENAI_API_KEY ดูเหมือนเป็น OpenRouter key ไม่ใช่ OpenAI image key')
  }

  if (present('SUPABASE_URL')) {
    try {
      const supabaseUrl = new URL(process.env.SUPABASE_URL!.trim())
      if (supabaseUrl.protocol !== 'https:' || !supabaseUrl.hostname.endsWith('.supabase.co')) {
        invalid.push('SUPABASE_URL ต้องเป็น URL รูปแบบ https://<project-ref>.supabase.co')
      }
    } catch {
      invalid.push('SUPABASE_URL ต้องเป็น URL ที่ถูกต้อง')
    }
  }

  if (present('DATABASE_URL')) {
    try {
      const databaseUrl = new URL(process.env.DATABASE_URL!.trim())
      if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        invalid.push('DATABASE_URL ต้องเป็น Postgres connection string')
      }
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(databaseUrl.hostname)) {
        invalid.push('DATABASE_URL ห้ามชี้ไป localhost/127.0.0.1/0.0.0.0/::1 ใน production')
      }
      const user = decodeURIComponent(databaseUrl.username).toLowerCase()
      const password = decodeURIComponent(databaseUrl.password).toLowerCase()
      const databaseName = databaseUrl.pathname.replace(/^\//, '').toLowerCase()
      if (['user', 'username'].includes(user) || ['password', 'pass'].includes(password) || ['database', 'db'].includes(databaseName)) {
        invalid.push('DATABASE_URL ยังมีค่าตัวอย่างของ user/password/database')
      }
      if (databaseUrl.searchParams.get('sslmode') !== 'require') {
        invalid.push('DATABASE_URL ต้องมี sslmode=require ใน production')
      }
    } catch {
      invalid.push('DATABASE_URL ต้องเป็น Postgres connection string ที่ถูกต้อง')
    }
  }

  if (present('SUPABASE_URL') && present('SUPABASE_JWT_ISSUER')) {
    const expectedIssuer = `${normalizeUrl(process.env.SUPABASE_URL!)}/auth/v1`
    if (normalizeUrl(process.env.SUPABASE_JWT_ISSUER!) !== expectedIssuer) {
      invalid.push('SUPABASE_JWT_ISSUER ต้องเท่ากับ SUPABASE_URL + /auth/v1')
    }
  }

  if (present('SUPABASE_SERVICE_ROLE_KEY')) {
    const role = jwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY!.trim())
    if (role && role !== 'service_role') {
      invalid.push('SUPABASE_SERVICE_ROLE_KEY ต้องใช้ key role service_role')
    }
  }

  if (present('STORAGE_PROVIDER') && process.env.STORAGE_PROVIDER !== 'supabase') {
    invalid.push('STORAGE_PROVIDER ต้องเป็น supabase ใน production')
  }
  if (present('SUPABASE_STORAGE_ACCESS') && process.env.SUPABASE_STORAGE_ACCESS !== 'signed') {
    invalid.push('SUPABASE_STORAGE_ACCESS ต้องเป็น signed ใน production')
  }
  if (present('SUPABASE_SIGNED_URL_EXPIRES_IN')) {
    const expiresIn = Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN)
    if (!Number.isFinite(expiresIn) || !Number.isInteger(expiresIn) || expiresIn <= 0) {
      invalid.push('SUPABASE_SIGNED_URL_EXPIRES_IN ต้องเป็นจำนวนเต็มบวก')
    }
  }
  if (present('IMAGE_GENERATION_SIZE') && !/^\d+x\d+$/.test(process.env.IMAGE_GENERATION_SIZE!.trim())) {
    invalid.push('IMAGE_GENERATION_SIZE ต้องใช้รูปแบบ WIDTHxHEIGHT')
  }
  if (present('IMAGE_GENERATION_OUTPUT_FORMAT')) {
    const format = process.env.IMAGE_GENERATION_OUTPUT_FORMAT!.trim()
    if (!['png', 'jpeg', 'webp'].includes(format)) {
      invalid.push('IMAGE_GENERATION_OUTPUT_FORMAT ต้องเป็น png, jpeg, หรือ webp')
    }
  }
  if (present('IMAGE_GENERATION_OUTPUT_COMPRESSION')) {
    const compression = Number(process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION)
    if (!Number.isFinite(compression) || !Number.isInteger(compression) || compression < 0 || compression > 100) {
      invalid.push('IMAGE_GENERATION_OUTPUT_COMPRESSION ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 100')
    }
  }

  for (const name of recommendedInProduction) {
    if (present(name)) {
      const cost = Number(process.env[name])
      if (!Number.isFinite(cost) || cost < 0) {
        invalid.push(`${name} ต้องเป็นตัวเลข 0 หรือมากกว่า`)
      }
    }
  }

  if (present('MODEL_TEMPERATURE')) {
    const temperature = Number(process.env.MODEL_TEMPERATURE)
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      invalid.push('MODEL_TEMPERATURE ต้องอยู่ระหว่าง 0 ถึง 2')
    }
  }
  if (present('MODEL_MAX_OUTPUT_TOKENS')) {
    const maxTokens = Number(process.env.MODEL_MAX_OUTPUT_TOKENS)
    if (!Number.isFinite(maxTokens) || !Number.isInteger(maxTokens) || maxTokens < 128 || maxTokens > 2400) {
      invalid.push('MODEL_MAX_OUTPUT_TOKENS ต้องเป็นจำนวนเต็มตั้งแต่ 128 ถึง 2400')
    } else if (maxTokens < 1200) {
      invalid.push('MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production')
    }
  }
  if (present('MODEL_MIN_ROLEPLAY_REPLY_CHARS')) {
    const minChars = Number(process.env.MODEL_MIN_ROLEPLAY_REPLY_CHARS)
    if (!Number.isFinite(minChars) || !Number.isInteger(minChars) || minChars < 0 || minChars > 1200) {
      invalid.push('MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 1200')
    } else if (minChars < 320) {
      invalid.push('MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production')
    }
  }
  if (present('PROMPT_BUDGET_TOKENS')) {
    const budget = Number(process.env.PROMPT_BUDGET_TOKENS)
    if (!Number.isFinite(budget) || !Number.isInteger(budget) || budget < 1200 || budget > 20000) {
      invalid.push('PROMPT_BUDGET_TOKENS ต้องเป็นจำนวนเต็มตั้งแต่ 1200 ถึง 20000')
    }
  }
  if (present('PROMPT_HISTORY_MAX_MESSAGES')) {
    const messages = Number(process.env.PROMPT_HISTORY_MAX_MESSAGES)
    if (!Number.isFinite(messages) || !Number.isInteger(messages) || messages < 0 || messages > 40) {
      invalid.push('PROMPT_HISTORY_MAX_MESSAGES ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 40')
    }
  }
  if (present('CHAT_PROVIDER_RETRY_ATTEMPTS')) {
    const attempts = Number(process.env.CHAT_PROVIDER_RETRY_ATTEMPTS)
    if (!Number.isFinite(attempts) || !Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
      invalid.push('CHAT_PROVIDER_RETRY_ATTEMPTS ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5')
    }
  }
  if (present('CHAT_PROVIDER_RETRY_DELAY_MS')) {
    const delayMs = Number(process.env.CHAT_PROVIDER_RETRY_DELAY_MS)
    if (!Number.isFinite(delayMs) || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 5000) {
      invalid.push('CHAT_PROVIDER_RETRY_DELAY_MS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 5000')
    }
  }
  if (present('CREATOR_DRAFT_RETRY_ATTEMPTS')) {
    const attempts = Number(process.env.CREATOR_DRAFT_RETRY_ATTEMPTS)
    if (!Number.isFinite(attempts) || !Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
      invalid.push('CREATOR_DRAFT_RETRY_ATTEMPTS ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5')
    }
  }
  if (present('CREATOR_DRAFT_RETRY_DELAY_MS')) {
    const delayMs = Number(process.env.CREATOR_DRAFT_RETRY_DELAY_MS)
    if (!Number.isFinite(delayMs) || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 5000) {
      invalid.push('CREATOR_DRAFT_RETRY_DELAY_MS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 5000')
    }
  }

  return invalid
}

export function validateRuntimeEnv(options: { throwOnError?: boolean } = {}) {
  const shouldThrow = options.throwOnError ?? true
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const missingRequired: string[] = [...requiredInProduction.filter((name) => !present(name))]
  const missingRecommended = recommendedInProduction.filter((name) => !present(name))
  const invalid = invalidProductionValues()

  if (mode === 'production' && !present('SUPABASE_ANON_KEY') && !present('SUPABASE_PUBLISHABLE_KEY')) {
    missingRequired.push('SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY')
  }
  if (mode === 'production' && !present('IMAGE_GENERATION_API_KEY') && !present('OPENAI_API_KEY')) {
    missingRequired.push('IMAGE_GENERATION_API_KEY or OPENAI_API_KEY')
  }

  if (shouldThrow && mode === 'production' && missingRequired.length > 0) {
    throw new Error(`ขาด production env ที่จำเป็น: ${missingRequired.join(', ')}`)
  }
  if (shouldThrow && mode === 'production' && invalid.length > 0) {
    throw new Error(`production env ไม่ถูกต้อง: ${invalid.join(', ')}`)
  }

  return {
    ok: mode === 'development' || (missingRequired.length === 0 && invalid.length === 0),
    mode,
    missingRequired,
    missingRecommended,
    invalid,
  }
}

export function logRuntimeEnvStatus() {
  const status = validateRuntimeEnv({ throwOnError: false })
  if (status.missingRequired.length > 0) {
    console.warn(`[env] ขาด production env ที่จำเป็น: ${status.missingRequired.join(', ')}`)
  }
  if (status.missingRecommended.length > 0) {
    console.warn(`[env] ขาด production env ที่แนะนำ: ${status.missingRecommended.join(', ')}`)
  }
  if (status.invalid.length > 0) {
    console.warn(`[env] production env ไม่ถูกต้อง: ${status.invalid.join(', ')}`)
  }
  if (status.mode === 'production' && status.missingRequired.length > 0) {
    throw new Error(`ขาด production env ที่จำเป็น: ${status.missingRequired.join(', ')}`)
  }
  if (status.mode === 'production' && status.invalid.length > 0) {
    throw new Error(`production env ไม่ถูกต้อง: ${status.invalid.join(', ')}`)
  }
  return status
}
