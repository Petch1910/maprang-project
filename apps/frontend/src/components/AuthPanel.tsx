import { useEffect, useState } from 'react'
import { DEFAULT_USER_ID, setApiUserId } from '../lib/api'
import { getAuthState, getSupabase, syncApiAuthFromSession, type AuthState } from '../lib/auth'

type AuthPanelProps = {
  onAuthChanged: () => Promise<void>
}

const inputClass =
  'min-h-10 rounded-xl border border-slate-900/15 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

export function AuthPanel({ onAuthChanged }: AuthPanelProps) {
  const [authState, setAuthState] = useState<AuthState>({ isConfigured: false, session: null, user: null })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devUserId, setDevUserId] = useState(() => localStorage.getItem('maprang:userId') || DEFAULT_USER_ID)
  const [note, setNote] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const refreshAuthState = async () => {
    const next = await getAuthState()
    setAuthState(next)
  }

  useEffect(() => {
    void refreshAuthState()
    let unsubscribe: (() => void) | undefined

    void getSupabase().then((client) => {
      if (!client) return
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        syncApiAuthFromSession(session)
        setAuthState({
          isConfigured: true,
          session,
          user: session?.user ?? null,
        })
        void onAuthChanged()
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe?.()
  }, [])

  const signIn = async () => {
    const supabase = await getSupabase()
    if (!supabase) return
    setIsBusy(true)
    setNote('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await refreshAuthState()
      await onAuthChanged()
      setNote('Signed in')
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Sign in failed')
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    const supabase = await getSupabase()
    if (!supabase) return
    setIsBusy(true)
    setNote('')
    try {
      await supabase.auth.signOut()
      await refreshAuthState()
      await onAuthChanged()
      setNote('Signed out')
    } finally {
      setIsBusy(false)
    }
  }

  const applyDevUser = async () => {
    setApiUserId(devUserId.trim() || DEFAULT_USER_ID)
    await onAuthChanged()
    setNote('Dev user updated')
  }

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">Auth</p>
          <h2 className="m-0 text-base font-bold text-slate-900">
            {authState.user?.email ?? (authState.isConfigured ? 'Supabase ready' : 'Local dev user')}
          </h2>
        </div>
        <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
          {authState.isConfigured ? 'supabase' : 'dev'}
        </span>
      </div>

      {authState.isConfigured ? (
        <div className="flex flex-col gap-2">
          {!authState.user && (
            <>
              <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
              <input
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
              />
              <button
                className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-60"
                disabled={isBusy || !email || !password}
                onClick={signIn}
              >
                Sign in
              </button>
            </>
          )}

          {authState.user && (
            <button
              className="min-h-10 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-extrabold text-slate-700 disabled:opacity-60"
              disabled={isBusy}
              onClick={signOut}
            >
              Sign out
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input className={inputClass} value={devUserId} onChange={(event) => setDevUserId(event.target.value)} />
          <button className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white" onClick={applyDevUser}>
            Use dev user
          </button>
        </div>
      )}

      {note && <p className="mt-2 mb-0 text-xs font-bold text-slate-500">{note}</p>}
    </section>
  )
}
