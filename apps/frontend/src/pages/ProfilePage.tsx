import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Coins, ShieldCheck } from 'lucide-react'
import { AuthPanel } from '../components/AuthPanel'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadContentSettings, saveContentSettings, selectContentSettings } from '../store/slices/contentSlice'
import { loadPersonaDraft, savePersonaDraft, savePersonaDraftToCloud, selectPersonaDraft, selectPersonaUpdatedAt } from '../store/slices/draftsSlice'
import { loadWalletSummary, selectIsLowToken, selectTokenBalance } from '../store/slices/walletSlice'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'
import { testConnection } from '../lib/api'

const personaTemplate = [
  'ชื่อ:',
  'สรรพนาม:',
  'สไตล์โรลเพลย์:',
  'ขอบเขตที่ไม่ต้องการ:',
  'โทนที่ชอบ:',
  'สิ่งที่อยากให้ตัวละครจำ:',
].join('\n')

const personaSavedAtKey = 'maprang:persona-saved-at:v1'
const contentModes = [
  {
    label: 'ทั่วไป',
    detail: 'ซ่อนเนื้อหาเข้มข้น เหมาะกับผู้ใช้ทั่วไป',
    isAdult: false,
    maxRating: 'general',
  },
  {
    label: 'โรแมนซ์เบา',
    detail: 'อนุญาตความสัมพันธ์และอารมณ์โรแมนซ์แบบไม่จัดเต็ม',
    isAdult: false,
    maxRating: 'teen_romance',
  },
  {
    label: 'ผู้ใหญ่ 18+',
    detail: 'เปิดโหมดผู้ใหญ่สำหรับเนื้อเรื่องจำลอง/สมมุติ และให้ระบบหลังบ้านจำกัดตามบัญชี',
    isAdult: true,
    maxRating: 'restricted_18',
  },
] as const

function initialSavedAt() {
  if (typeof window === 'undefined') return ''
  return safeGetStorageItem(window.localStorage, personaSavedAtKey) ?? ''
}

function formatSavedAt(value: string) {
  if (!value) return 'ยังไม่มีการแก้ไขในรอบนี้'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'ยังไม่มีการแก้ไขในรอบนี้'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isLowToken = useAppSelector(selectIsLowToken)
  const personaDraft = useAppSelector(selectPersonaDraft)
  const personaUpdatedAt = useAppSelector(selectPersonaUpdatedAt)
  const contentSettings = useAppSelector(selectContentSettings)
  const [savedAt, setSavedAt] = useState(initialSavedAt)
  const [contentNote, setContentNote] = useState('')
  const [isContentSaving, setIsContentSaving] = useState(false)
  const [personaNote, setPersonaNote] = useState('')
  const [bypassEnabled, setBypassEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return safeGetStorageItem(window.localStorage, 'maprang:bypassEnabled') === 'true'
  })
  const [customApiKey, setCustomApiKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    return safeGetStorageItem(window.localStorage, 'maprang:customApiKey') || ''
  })
  const [customApiProvider, setCustomApiProvider] = useState(() => {
    if (typeof window === 'undefined') return 'openrouter'
    return safeGetStorageItem(window.localStorage, 'maprang:customApiProvider') || 'openrouter'
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const saveSettings = (enabled: boolean, key: string, provider: string) => {
    if (typeof window === 'undefined') return
    safeSetStorageItem(window.localStorage, 'maprang:bypassEnabled', String(enabled))
    safeSetStorageItem(window.localStorage, 'maprang:customApiKey', key.trim())
    safeSetStorageItem(window.localStorage, 'maprang:customApiProvider', provider)
  }

  const handleTestConnection = async () => {
    if (!customApiKey.trim()) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await testConnection(customApiKey, customApiProvider)
      setTestResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'การเชื่อมต่อล้มเหลว'
      setTestResult({ ok: false, message: msg })
    } finally {
      setIsTesting(false)
    }
  }

  const personaSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const personaLength = personaDraft.trim().length
  const personaPreview = useMemo(() => {
    const lines = personaDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
    return lines.length > 0 ? lines : ['ยังไม่ได้ตั้งค่าตัวตน ผู้ช่วยจะใช้บริบทพื้นฐานของผู้ใช้']
  }, [personaDraft])

  const refreshAccountData = useCallback(async () => {
    await Promise.allSettled([
      dispatch(loadWalletSummary()).unwrap(),
      dispatch(loadContentSettings()).unwrap(),
      dispatch(loadPersonaDraft()).unwrap(),
    ])
  }, [dispatch])

  useEffect(() => {
    if (!personaUpdatedAt) return
    setSavedAt(personaUpdatedAt)
    if (typeof window !== 'undefined') safeSetStorageItem(window.localStorage, personaSavedAtKey, personaUpdatedAt)
  }, [personaUpdatedAt])

  useEffect(
    () => () => {
      if (personaSaveTimer.current) clearTimeout(personaSaveTimer.current)
    },
    [],
  )

  const schedulePersonaCloudSave = (value: string, savedAtValue: string) => {
    if (personaSaveTimer.current) clearTimeout(personaSaveTimer.current)
    setPersonaNote('กำลังบันทึกตัวตน...')
    personaSaveTimer.current = setTimeout(() => {
      void dispatch(savePersonaDraftToCloud(value))
        .unwrap()
        .then((saved) => {
          setPersonaNote('บันทึกตัวตนลงบัญชีแล้ว')
          if (saved.updatedAt && typeof window !== 'undefined') safeSetStorageItem(window.localStorage, personaSavedAtKey, saved.updatedAt)
        })
        .catch(() => {
          setPersonaNote('บันทึกลงบัญชีไม่ได้ แต่ดราฟต์ในเครื่องยังอยู่')
          if (typeof window !== 'undefined') safeSetStorageItem(window.localStorage, personaSavedAtKey, savedAtValue)
        })
    }, 700)
  }

  const updatePersona = (value: string) => {
    const nextSavedAt = new Date().toISOString()
    dispatch(savePersonaDraft(value))
    setSavedAt(nextSavedAt)
    if (typeof window !== 'undefined') safeSetStorageItem(window.localStorage, personaSavedAtKey, nextSavedAt)
    schedulePersonaCloudSave(value, nextSavedAt)
  }

  const updateContentMode = async (mode: (typeof contentModes)[number]) => {
    if (isContentSaving) return
    setContentNote('กำลังบันทึกโหมดคอนเทนต์...')
    setIsContentSaving(true)
    try {
      await dispatch(saveContentSettings({ isAdult: mode.isAdult, maxRating: mode.maxRating })).unwrap()
      setContentNote(`บันทึกโหมด ${mode.label} แล้ว`)
    } catch {
      setContentNote('บันทึกโหมดคอนเทนต์ไม่ได้ กรุณาเช็กการเชื่อมต่อระบบหลังบ้าน')
    } finally {
      setIsContentSaving(false)
    }
  }

  return (
    <div className="grid gap-4 p-4 text-white sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
      <section className="rounded-lg border border-white/10 bg-[#18181d]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">โปรไฟล์ / ตัวตนผู้เล่น</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/58">
              ข้อมูลนี้จะบันทึกอัตโนมัติในเครื่อง และแนบไปกับทุกแชทเพื่อให้ AI เข้าใจบริบทของคุณมากขึ้น
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-400/12 px-3 py-1 text-xs font-black text-emerald-100">
            บันทึกอัตโนมัติ
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            className="min-h-10 rounded-lg border border-white/10 bg-white/6 px-3 text-sm font-black text-white/76 transition hover:bg-white/10 hover:text-white"
            data-testid="profile-persona-template"
            onClick={() => updatePersona(personaDraft.trim() ? `${personaDraft}\n\n${personaTemplate}` : personaTemplate)}
            type="button"
          >
            ใส่แม่แบบ
          </button>
          <button
            className="min-h-10 rounded-lg border border-white/10 bg-white/6 px-3 text-sm font-black text-white/76 transition hover:bg-white/10 hover:text-white"
            data-testid="profile-persona-clear"
            onClick={() => updatePersona('')}
            type="button"
          >
            ล้างข้อมูล
          </button>
          <div
            className="flex min-h-10 items-center rounded-lg border border-white/10 bg-white/6 px-3 text-sm font-bold text-white/58"
            data-testid="profile-persona-count"
          >
            {personaLength.toLocaleString()}/2,000 ตัวอักษร
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black text-white/68">ข้อมูลตัวตน</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-lg border border-white/10 bg-black/25 p-4 text-sm font-bold leading-7 text-white outline-none placeholder:text-white/35 focus:border-amber-400/70"
            data-testid="profile-persona-textarea"
            maxLength={2000}
            onChange={(event) => updatePersona(event.target.value)}
            placeholder="ชื่อ สรรพนาม บุคลิก บทบาท ขอบเขตที่ไม่ต้องการ..."
            value={personaDraft}
          />
        </label>
        <div className="mt-4 rounded-lg border border-sky-300/25 bg-sky-400/10 p-4 text-sm font-bold leading-6 text-sky-100">
          เขียนให้กระชับจะได้ผลดีที่สุด เน้นตัวตน สไตล์การเล่น และขอบเขตสำคัญ มากกว่าประวัติยาวๆ
        </div>
        {personaNote && (
          <p
            className="m-0 mt-3 rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold text-white/58"
            data-testid="profile-persona-note"
          >
            {personaNote}
          </p>
        )}

        <section className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-lg font-black text-white">ตั้งค่าคอนเทนต์</h2>
              <p className="m-0 mt-1 text-sm font-bold leading-6 text-white/55">
                ใช้ควบคุมสิ่งที่หน้าสำรวจและระบบแชทอนุญาตให้เห็น โดยระบบหลังบ้านจะจำกัดซ้ำตามบัญชี
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-black text-white/65">
              {contentSettings.maxRating}
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {contentModes.map((mode) => {
              const isActive = contentSettings.isAdult === mode.isAdult && contentSettings.maxRating === mode.maxRating
              const contentModeTitle = isContentSaving ? 'กำลังบันทึกโหมดคอนเทนต์ รอสักครู่ก่อนเปลี่ยนโหมด' : `เลือกโหมด ${mode.label}`
              return (
                <button
                  aria-disabled={isContentSaving}
                  aria-pressed={isActive}
                  className={`min-h-24 rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    isActive
                      ? 'border-orange-300/45 bg-orange-400/14 text-orange-50 shadow-[0_18px_46px_rgba(249,115,22,0.12)]'
                      : 'border-white/10 bg-black/20 text-white/68 hover:bg-white/7 hover:text-white'
                  }`}
                  data-testid={`profile-content-mode-${mode.maxRating}`}
                  disabled={isContentSaving}
                  key={mode.maxRating}
                  onClick={() => void updateContentMode(mode)}
                  title={contentModeTitle}
                  type="button"
                >
                  <span className="block text-sm font-black">{mode.label}</span>
                  <span className="mt-1 block text-xs font-bold leading-5 opacity-75">{mode.detail}</span>
                </button>
              )
            })}
          </div>
          {contentNote && (
            <p className="m-0 mt-3 rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold text-white/58" data-testid="profile-content-note">
              {contentNote}
            </p>
          )}
        </section>

        <section className="mt-5 rounded-lg maprang-glass p-5">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            ⚙️ โหมดนักพัฒนา & ผู้ทดสอบระบบ
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-white/55">
            ตั้งค่า API Key ส่วนตัวเพื่อทดสอบระบบสนทนาและการสร้างรูปภาพโดยไม่มีค่าใช้จ่ายเหรียญโทเคน
          </p>

          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-white/10 bg-black/20 text-indigo-600 focus:ring-indigo-500"
                checked={bypassEnabled}
                onChange={(e) => {
                  setBypassEnabled(e.target.checked)
                  saveSettings(e.target.checked, customApiKey, customApiProvider)
                }}
              />
              <span className="text-sm font-bold text-white/80">เปิดใช้งานโหมดผู้ทดสอบระบบ (Bypass Token System)</span>
            </label>

            {bypassEnabled && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black text-white/68">ผู้ให้บริการ (Provider)</span>
                    <select
                      className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm font-bold text-white outline-none focus:border-purple-500"
                      value={customApiProvider}
                      onChange={(e) => {
                        setCustomApiProvider(e.target.value)
                        saveSettings(bypassEnabled, customApiKey, e.target.value)
                      }}
                    >
                      <option value="openrouter">OpenRouter (แนะนำ)</option>
                      <option value="openai">OpenAI (Direct API)</option>
                      <option value="gemini">Gemini (Direct API)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black text-white/68">API Key ส่วนตัว</span>
                    <input
                      type="password"
                      placeholder="sk-..."
                      className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm font-bold text-white outline-none focus:border-purple-500"
                      value={customApiKey}
                      onChange={(e) => {
                        setCustomApiKey(e.target.value)
                      }}
                      onBlur={() => {
                        const trimmed = customApiKey.trim()
                        setCustomApiKey(trimmed)
                        saveSettings(bypassEnabled, trimmed, customApiProvider)
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="min-h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 px-4 text-xs font-black text-white transition disabled:opacity-50"
                    onClick={handleTestConnection}
                    disabled={isTesting || !customApiKey.trim()}
                    title="กรุณากรอก API Key เพื่อทดสอบการเชื่อมต่อ"
                  >
                    {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ (Test Connection)'}
                  </button>
                  {testResult && (
                    <span className={`text-xs font-bold ${testResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {testResult.message}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-bold text-white/35 flex items-center gap-1">
                  🔒 Privacy Lock: API Key จะถูกบันทึกไว้ที่เบราว์เซอร์ (LocalStorage) ของท่านเท่านั้น โดยจะไม่บันทึกเข้าสู่เซิร์ฟเวอร์หลักอย่างเด็ดขาด
                </p>
              </div>
            )}
          </div>
        </section>
      </section>

      <aside className="rounded-lg border border-white/10 bg-[#18181d]/90 p-5 shadow-[0_18px_58px_rgba(0,0,0,0.18)]">
        <div className="mb-4" data-testid="profile-auth-panel">
          <AuthPanel onAuthChanged={refreshAccountData} />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="m-0 text-sm font-black text-white">พรีวิวบริบทที่ส่งให้ AI</p>
          <div className="mt-2 space-y-1 text-xs font-bold leading-5 text-white/55">
            {personaPreview.map((line) => (
              <p className="m-0 rounded-md border border-white/10 bg-black/22 px-2 py-1" key={line}>
                {line}
              </p>
            ))}
          </div>
          <p className="m-0 mt-3 text-[11px] font-bold text-white/38">บันทึกล่าสุด: {formatSavedAt(savedAt)}</p>
        </div>

        <p className="mt-5 text-sm font-black text-white/48">ยอดโทเคน</p>
        <p className="mt-2 text-4xl font-black text-white">{tokenBalance.toLocaleString()}</p>
        {isLowToken && (
          <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-400/10 p-3 text-sm font-bold text-amber-100">โทเคนใกล้หมดแล้ว</p>
        )}
        <div className="mt-5 space-y-2 text-sm font-bold text-white/55">
          <p className="m-0 font-black text-white">หมายเหตุการใช้งาน</p>
          <p className="m-0">ระหว่าง AI กำลังตอบ ระบบจะกันการกดส่งซ้ำ</p>
          <p className="m-0">ข้อมูลตัวตนที่ยาวเกินไปจะใช้โทเคนมากขึ้น ควรเขียนให้ตรงประเด็น</p>
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="m-0 text-sm font-black text-white">เครื่องมือบัญชี</p>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-300"
            to="/wallet"
          >
            <Coins size={17} />
            การใช้โทเคน
          </Link>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/6 px-4 text-sm font-black text-white/76 transition hover:bg-white/10 hover:text-white"
            to="/moderation"
          >
            <ShieldCheck size={17} />
            คิวตรวจรายงาน
          </Link>
        </div>
      </aside>
    </div>
  )
}
