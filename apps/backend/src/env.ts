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
] as const

function present(name: string) {
  const value = process.env[name]?.trim()
  if (!value) return false
  return !value.startsWith('replace-with-') && !value.includes('your-project.supabase.co') && !value.includes('example.com')
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
        invalid.push('CORS_ORIGINS must use https origins in production')
        break
      }
      if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
        invalid.push('CORS_ORIGINS must not include local origins in production')
        break
      }
    } catch {
      invalid.push('CORS_ORIGINS must be a comma-separated list of valid origins')
      break
    }
  }

  if (present('ADMIN_API_KEY') && process.env.ADMIN_API_KEY!.trim().length < 32) {
    invalid.push('ADMIN_API_KEY must be at least 32 characters')
  }

  if (present('OPENROUTER_API_KEY') && process.env.OPENROUTER_API_KEY!.trim().startsWith('sk-proj-')) {
    invalid.push('OPENROUTER_API_KEY appears to be an OpenAI project key, not an OpenRouter key')
  }

  if (present('SUPABASE_URL')) {
    try {
      const supabaseUrl = new URL(process.env.SUPABASE_URL!.trim())
      if (supabaseUrl.protocol !== 'https:' || !supabaseUrl.hostname.endsWith('.supabase.co')) {
        invalid.push('SUPABASE_URL must be a https://<project-ref>.supabase.co URL')
      }
    } catch {
      invalid.push('SUPABASE_URL must be a valid URL')
    }
  }

  if (present('SUPABASE_URL') && present('SUPABASE_JWT_ISSUER')) {
    const expectedIssuer = `${normalizeUrl(process.env.SUPABASE_URL!)}/auth/v1`
    if (normalizeUrl(process.env.SUPABASE_JWT_ISSUER!) !== expectedIssuer) {
      invalid.push('SUPABASE_JWT_ISSUER must equal SUPABASE_URL + /auth/v1')
    }
  }

  if (present('SUPABASE_SERVICE_ROLE_KEY')) {
    const role = jwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY!.trim())
    if (role && role !== 'service_role') {
      invalid.push('SUPABASE_SERVICE_ROLE_KEY must use a service_role key')
    }
  }

  if (present('STORAGE_PROVIDER') && process.env.STORAGE_PROVIDER !== 'supabase') {
    invalid.push('STORAGE_PROVIDER must be supabase in production')
  }
  if (
    present('SUPABASE_STORAGE_ACCESS') &&
    process.env.SUPABASE_STORAGE_ACCESS !== 'signed' &&
    process.env.SUPABASE_STORAGE_ACCESS !== 'public'
  ) {
    invalid.push('SUPABASE_STORAGE_ACCESS must be signed or public')
  }
  if (
    process.env.SUPABASE_STORAGE_ACCESS === 'signed' &&
    present('SUPABASE_SIGNED_URL_EXPIRES_IN')
  ) {
    const expiresIn = Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN)
    if (!Number.isFinite(expiresIn) || !Number.isInteger(expiresIn) || expiresIn <= 0) {
      invalid.push('SUPABASE_SIGNED_URL_EXPIRES_IN must be a positive integer')
    }
  }

  for (const name of recommendedInProduction) {
    if (present(name)) {
      const cost = Number(process.env[name])
      if (!Number.isFinite(cost) || cost < 0) {
        invalid.push(`${name} must be a non-negative number`)
      }
    }
  }

  return invalid
}

export function validateRuntimeEnv() {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const missingRequired: string[] = [...requiredInProduction.filter((name) => !present(name))]
  const missingRecommended = recommendedInProduction.filter((name) => !present(name))
  const invalid = invalidProductionValues()

  if (mode === 'production' && !present('SUPABASE_ANON_KEY') && !present('SUPABASE_PUBLISHABLE_KEY')) {
    missingRequired.push('SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY')
  }

  if (mode === 'production' && missingRequired.length > 0) {
    throw new Error(`Missing required production env: ${missingRequired.join(', ')}`)
  }
  if (mode === 'production' && invalid.length > 0) {
    throw new Error(`Invalid production env: ${invalid.join(', ')}`)
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
  const status = validateRuntimeEnv()
  if (status.missingRequired.length > 0) {
    console.warn(`[env] Missing required env for production: ${status.missingRequired.join(', ')}`)
  }
  if (status.missingRecommended.length > 0) {
    console.warn(`[env] Missing recommended production env: ${status.missingRecommended.join(', ')}`)
  }
  if (status.invalid.length > 0) {
    console.warn(`[env] Invalid production env: ${status.invalid.join(', ')}`)
  }
  return status
}
