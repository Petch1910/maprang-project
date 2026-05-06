import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { clearApiAuth, setAccessToken, setApiUserId } from './api'
import { hasRealEnvValue, SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export const isSupabaseConfigured = hasRealEnvValue(SUPABASE_URL) && hasRealEnvValue(SUPABASE_ANON_KEY)

let supabaseClient: SupabaseClient | null = null

export async function getSupabase() {
  if (!isSupabaseConfigured) return null
  if (supabaseClient) return supabaseClient

  const { createClient } = await import('@supabase/supabase-js')
  supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
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
