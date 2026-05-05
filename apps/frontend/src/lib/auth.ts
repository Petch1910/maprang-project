import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { clearApiAuth, setAccessToken, setApiUserId } from './api'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function hasRealEnvValue(value: string | undefined) {
  return Boolean(value?.trim() && !value.includes('your-project.supabase.co') && !value.startsWith('replace-with-'))
}

export const isSupabaseConfigured = hasRealEnvValue(supabaseUrl) && hasRealEnvValue(supabaseAnonKey)

let supabaseClient: SupabaseClient | null = null

export async function getSupabase() {
  if (!isSupabaseConfigured) return null
  if (supabaseClient) return supabaseClient

  const { createClient } = await import('@supabase/supabase-js')
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return supabaseClient
}

export type AuthState = {
  isConfigured: boolean
  session: Session | null
  user: User | null
}

export function syncApiAuthFromSession(session: Session | null) {
  if (!session) {
    clearApiAuth()
    return
  }

  setAccessToken(session.access_token)
  setApiUserId(session.user.id)
}

export async function getAuthState(): Promise<AuthState> {
  const supabase = await getSupabase()
  if (!supabase) return { isConfigured: false, session: null, user: null }

  const { data } = await supabase.auth.getSession()
  syncApiAuthFromSession(data.session)
  return {
    isConfigured: true,
    session: data.session,
    user: data.session?.user ?? null,
  }
}
