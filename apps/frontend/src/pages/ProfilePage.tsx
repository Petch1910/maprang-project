import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Coins, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { saveContentSettings, selectContentSettings } from '../store/slices/contentSlice'
import { savePersonaDraft, savePersonaDraftToCloud, selectPersonaDraft, selectPersonaUpdatedAt } from '../store/slices/draftsSlice'
import { selectIsLowToken, selectTokenBalance } from '../store/slices/walletSlice'

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
    detail: 'เปิดโหมดผู้ใหญ่สำหรับเนื้อเรื่องจำลอง/สมมุติ และให้ backend จำกัดตามบัญชี',
    isAdult: true,
    maxRating: 'restricted_18',
  },
] as const

function initialSavedAt() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(personaSavedAtKey) ?? ''
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
  const [personaNote, setPersonaNote] = useState('')
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

  useEffect(() => {
    if (!personaUpdatedAt) return
    setSavedAt(personaUpdatedAt)
    if (typeof window !== 'undefined') window.localStorage.setItem(personaSavedAtKey, personaUpdatedAt)
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
          if (saved.updatedAt && typeof window !== 'undefined') window.localStorage.setItem(personaSavedAtKey, saved.updatedAt)
        })
        .catch(() => {
          setPersonaNote('บันทึกลงบัญชีไม่ได้ แต่ดราฟต์ในเครื่องยังอยู่')
          if (typeof window !== 'undefined') window.localStorage.setItem(personaSavedAtKey, savedAtValue)
        })
    }, 700)
  }

  const updatePersona = (value: string) => {
    const nextSavedAt = new Date().toISOString()
    dispatch(savePersonaDraft(value))
    setSavedAt(nextSavedAt)
    if (typeof window !== 'undefined') window.localStorage.setItem(personaSavedAtKey, nextSavedAt)
    schedulePersonaCloudSave(value, nextSavedAt)
  }

  const updateContentMode = async (mode: (typeof contentModes)[number]) => {
    setContentNote('กำลังบันทึกโหมดคอนเทนต์...')
    try {
      await dispatch(saveContentSettings({ isAdult: mode.isAdult, maxRating: mode.maxRating })).unwrap()
      setContentNote(`บันทึกโหมด ${mode.label} แล้ว`)
    } catch {
      setContentNote('บันทึกโหมดคอนเทนต์ไม่ได้ กรุณาเช็กการเชื่อมต่อ backend')
    }
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
      <section className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">โปรไฟล์ / ตัวตนผู้เล่น</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              ข้อมูลนี้จะบันทึกอัตโนมัติในเครื่อง และแนบไปกับทุกแชทเพื่อให้ AI เข้าใจบริบทของคุณมากขึ้น
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">บันทึกอัตโนมัติ</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            data-testid="profile-persona-template"
            onClick={() => updatePersona(personaDraft.trim() ? `${personaDraft}\n\n${personaTemplate}` : personaTemplate)}
            type="button"
          >
            ใส่แม่แบบ
          </button>
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            data-testid="profile-persona-clear"
            onClick={() => updatePersona('')}
            type="button"
          >
            ล้างข้อมูล
          </button>
          <div className="flex min-h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-500" data-testid="profile-persona-count">
            {personaLength.toLocaleString()}/2,000 ตัวอักษร
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black text-slate-600">ข้อมูลตัวตน</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-lg border border-slate-900/10 p-4 text-sm leading-7 outline-none focus:border-blue-500"
            data-testid="profile-persona-textarea"
            maxLength={2000}
            onChange={(event) => updatePersona(event.target.value)}
            placeholder="ชื่อ สรรพนาม บุคลิก บทบาท ขอบเขตที่ไม่ต้องการ..."
            value={personaDraft}
          />
        </label>
        <div className="mt-4 rounded-lg border border-blue-500/15 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          เขียนให้กระชับจะได้ผลดีที่สุด เน้นตัวตน สไตล์การเล่น และขอบเขตสำคัญ มากกว่าประวัติยาวๆ
        </div>
        {personaNote && (
          <p className="m-0 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500" data-testid="profile-persona-note">
            {personaNote}
          </p>
        )}

        <section className="mt-5 rounded-lg border border-slate-900/10 bg-slate-50 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-lg font-black text-slate-950">ตั้งค่าคอนเทนต์</h2>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                ใช้ควบคุมสิ่งที่หน้า Explore และระบบแชทอนุญาตให้เห็น โดย backend จะจำกัดซ้ำตามบัญชี
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
              {contentSettings.maxRating}
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {contentModes.map((mode) => {
              const isActive = contentSettings.isAdult === mode.isAdult && contentSettings.maxRating === mode.maxRating
              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-24 rounded-lg border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-[0_12px_32px_rgba(249,115,22,0.12)]'
                      : 'border-slate-900/10 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  data-testid={`profile-content-mode-${mode.maxRating}`}
                  key={mode.maxRating}
                  onClick={() => void updateContentMode(mode)}
                  type="button"
                >
                  <span className="block text-sm font-black">{mode.label}</span>
                  <span className="mt-1 block text-xs font-bold leading-5 opacity-75">{mode.detail}</span>
                </button>
              )
            })}
          </div>
          {contentNote && (
            <p className="m-0 mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500" data-testid="profile-content-note">
              {contentNote}
            </p>
          )}
        </section>
      </section>

      <aside className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-3">
          <p className="m-0 text-sm font-black text-slate-900">พรีวิวบริบทที่ส่งให้ AI</p>
          <div className="mt-2 space-y-1 text-xs font-bold leading-5 text-slate-500">
            {personaPreview.map((line) => (
              <p className="m-0 rounded-md bg-white px-2 py-1" key={line}>
                {line}
              </p>
            ))}
          </div>
          <p className="m-0 mt-3 text-[11px] font-bold text-slate-400">บันทึกล่าสุด: {formatSavedAt(savedAt)}</p>
        </div>

        <p className="mt-5 text-sm font-black text-slate-500">ยอดโทเคน</p>
        <p className="mt-2 text-4xl font-black">{tokenBalance.toLocaleString()}</p>
        {isLowToken && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">โทเคนใกล้หมดแล้ว</p>}
        <div className="mt-5 space-y-2 text-sm text-slate-600">
          <p className="m-0 font-bold text-slate-900">หมายเหตุการใช้งาน</p>
          <p className="m-0">ระหว่าง AI กำลังตอบ ระบบจะกันการกดส่งซ้ำ</p>
          <p className="m-0">ข้อมูลตัวตนที่ยาวเกินไปจะใช้โทเคนมากขึ้น ควรเขียนให้ตรงประเด็น</p>
        </div>

        <div className="mt-5 border-t border-slate-900/10 pt-5">
          <p className="m-0 text-sm font-black text-slate-900">เครื่องมือบัญชี</p>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-black text-white transition hover:bg-amber-600"
            to="/wallet"
          >
            <Coins size={17} />
            การใช้โทเคน
          </Link>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
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
