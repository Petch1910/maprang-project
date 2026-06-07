export const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined
export const API_BASE_URL = RAW_API_BASE_URL || 'http://localhost:3000'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function hasRealEnvValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  return Boolean(
    normalized &&
      !normalized.includes('<') &&
      !normalized.includes('>') &&
      !normalized.includes('your-project.supabase.co') &&
      !normalized.includes('example.com') &&
      !normalized.startsWith('replace-with-') &&
      !['backend-domain', 'supabase-url', 'supabase-anon-key'].includes(normalized),
  )
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
}

export function supabaseJwtRole(value: string | undefined) {
  if (!value?.startsWith('eyJ')) return null
  const [, payload] = value.split('.')
  if (!payload) return null

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

export function isLocalOrPlaceholderUrl(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('example.com') || normalized.includes('<') || normalized.includes('>')) return true
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return true
    if (url.username || url.password) return true
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname.toLowerCase())
  } catch {
    return true
  }
}

export function frontendEnvWarnings() {
  const warnings: string[] = []
  const hasApiBase = hasRealEnvValue(RAW_API_BASE_URL)
  const hasSupabaseUrl = hasRealEnvValue(SUPABASE_URL)
  const hasSupabaseAnonKey = hasRealEnvValue(SUPABASE_ANON_KEY)

  if (import.meta.env.PROD && (!hasApiBase || isLocalOrPlaceholderUrl(API_BASE_URL))) {
    warnings.push('VITE_API_BASE_URL ยังไม่ใช่ URL บริการแชทจริง')
  }

  if (hasSupabaseUrl !== hasSupabaseAnonKey) {
    warnings.push('ตั้งค่า Supabase frontend ไม่ครบ ต้องมีทั้ง VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY')
  }

  if (import.meta.env.PROD && (!hasSupabaseUrl || !hasSupabaseAnonKey)) {
    warnings.push('หน้าเว็บใช้งานจริงยังไม่ได้ตั้งค่าการยืนยันตัวตน Supabase')
  }

  if (hasSupabaseUrl) {
    try {
      const url = new URL(SUPABASE_URL!)
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
        warnings.push('VITE_SUPABASE_URL ต้องเป็น https://<project-ref>.supabase.co')
      } else if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        warnings.push('VITE_SUPABASE_URL ต้องเป็น project API origin เท่านั้น ห้ามมี credential, path, query หรือ hash')
      }
    } catch {
      warnings.push('VITE_SUPABASE_URL ไม่ใช่ URL ที่ถูกต้อง')
    }
  }

  const supabaseAnonRole = supabaseJwtRole(SUPABASE_ANON_KEY)
  if (supabaseAnonRole && supabaseAnonRole !== 'anon') {
    warnings.push('VITE_SUPABASE_ANON_KEY ต้องเป็น anon/public key ห้ามใช้ service role key หรือ role อื่น')
  }

  return warnings
}
