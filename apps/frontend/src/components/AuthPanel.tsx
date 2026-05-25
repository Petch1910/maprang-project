import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_USER_ID, logUnexpectedError, setApiUserId } from '../lib/api'
import { getAuthState, getSupabase, isSupabaseConfigured, syncApiAuthFromSession, type AuthState } from '../lib/auth'
import { safeErrorTextForClassification } from '../lib/safeError'
import { safeGetStorageItem } from '../lib/safeStorage'

type AuthPanelProps = {
  onAuthChanged: () => Promise<void>
}

const inputClass =
  'min-h-10 rounded-xl border border-slate-900/15 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

function signInErrorMessage(error: unknown) {
  const message = safeErrorTextForClassification(error)
  if (message.includes('invalid') || message.includes('credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (message.includes('email not confirmed')) return 'ยังไม่ได้ยืนยันอีเมล'
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมล รหัสผ่าน หรือสถานะ Supabase แล้วลองใหม่'
}

function authFailureMessage(action: string) {
  return `${action}ไม่สำเร็จ กรุณาลองใหม่หรือตรวจการตั้งค่า Supabase`
}

export function AuthPanel({ onAuthChanged }: AuthPanelProps) {
  const [authState, setAuthState] = useState<AuthState>({ isConfigured: false, session: null, user: null })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devUserId, setDevUserId] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_USER_ID : safeGetStorageItem(window.localStorage, 'maprang:userId') || DEFAULT_USER_ID,
  )
  const [note, setNote] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const authBusyReason = isBusy ? 'กำลังทำรายการบัญชี รอให้เสร็จก่อน' : ''
  const signInDisabledReason = isBusy
    ? authBusyReason
    : !email
      ? 'กรอกอีเมลก่อนเข้าสู่ระบบ'
      : !password
        ? 'กรอกรหัสผ่านก่อนเข้าสู่ระบบ'
        : ''

  const refreshAuthState = useCallback(async (options?: { silent?: boolean }) => {
    try {
      const next = await getAuthState()
      setAuthState(next)
      return true
    } catch (error) {
      logUnexpectedError('โหลดสถานะบัญชีไม่สำเร็จ:', error)
      setAuthState({ isConfigured: isSupabaseConfigured, session: null, user: null })
      if (!options?.silent) setNote(authFailureMessage('โหลดสถานะบัญชี'))
      return false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    void refreshAuthState({ silent: true })
    let unsubscribe: (() => void) | undefined

    void getSupabase().then((client) => {
      if (!isMounted) return
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
    }).catch((error) => {
      logUnexpectedError('เชื่อมต่อระบบบัญชีไม่สำเร็จ:', error)
      if (isMounted) setNote(authFailureMessage('เชื่อมต่อระบบบัญชี'))
    })

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [onAuthChanged, refreshAuthState])

  const signIn = async () => {
    setIsBusy(true)
    setNote('')
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        setNote('ยังไม่ได้ตั้งค่า Supabase จึงใช้โหมด dev ในเครื่อง')
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await refreshAuthState({ silent: true })
      await onAuthChanged()
      setNote('เข้าสู่ระบบแล้ว')
    } catch (error) {
      setNote(signInErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const signOut = async () => {
    setIsBusy(true)
    setNote('')
    try {
      const supabase = await getSupabase()
      if (!supabase) {
        setNote('ยังไม่ได้ตั้งค่า Supabase จึงไม่มี session ให้ปิด')
        return
      }
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      await refreshAuthState({ silent: true })
      await onAuthChanged()
      setNote('ออกจากระบบแล้ว')
    } catch (error) {
      logUnexpectedError('ออกจากระบบไม่สำเร็จ:', error)
      setNote(authFailureMessage('ออกจากระบบ'))
    } finally {
      setIsBusy(false)
    }
  }

  const applyDevUser = async () => {
    setIsBusy(true)
    setNote('')
    try {
      setApiUserId(devUserId.trim() || DEFAULT_USER_ID)
      await onAuthChanged()
      setNote('อัปเดต dev user แล้ว')
    } catch (error) {
      logUnexpectedError('อัปเดต dev user ไม่สำเร็จ:', error)
      setNote(authFailureMessage('อัปเดต dev user'))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">บัญชี</p>
          <h2 className="m-0 text-base font-bold text-slate-900">
            {authState.user?.email ?? (authState.isConfigured ? 'Supabase พร้อมแล้ว' : 'ผู้ใช้ dev ในเครื่อง')}
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
              <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="อีเมล" />
              <input
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="รหัสผ่าน"
                type="password"
              />
              <button type="button"
                className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-60"
                aria-disabled={Boolean(signInDisabledReason)}
                disabled={isBusy || !email || !password}
                onClick={signIn}
                title={signInDisabledReason || 'เข้าสู่ระบบด้วย Supabase'}
              >
                เข้าสู่ระบบ
              </button>
            </>
          )}

          {authState.user && (
            <button type="button"
              className="min-h-10 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-extrabold text-slate-700 disabled:opacity-60"
              aria-disabled={isBusy}
              disabled={isBusy}
              onClick={signOut}
              title={authBusyReason || 'ออกจากระบบ'}
            >
              ออกจากระบบ
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input className={inputClass} value={devUserId} onChange={(event) => setDevUserId(event.target.value)} />
          <button
            type="button"
            className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-60"
            aria-disabled={isBusy}
            disabled={isBusy}
            onClick={applyDevUser}
            title={authBusyReason || 'ใช้ dev user นี้'}
          >
            ใช้ dev user
          </button>
        </div>
      )}

      {note && <p className="mt-2 mb-0 text-xs font-bold text-slate-500">{note}</p>}
    </section>
  )
}
