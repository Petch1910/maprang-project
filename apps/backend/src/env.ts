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

function invalidProductionValues() {
  if (process.env.NODE_ENV !== 'production') return []

  const invalid: string[] = []
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
    present('SUPABASE_SIGNED_URL_EXPIRES_IN') &&
    Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN) <= 0
  ) {
    invalid.push('SUPABASE_SIGNED_URL_EXPIRES_IN must be greater than 0')
  }

  return invalid
}

export function validateRuntimeEnv() {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const missingRequired = requiredInProduction.filter((name) => !present(name))
  const missingRecommended = recommendedInProduction.filter((name) => !present(name))
  const invalid = invalidProductionValues()

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
